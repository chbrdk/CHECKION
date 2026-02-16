/**
 * User Journey Agent: given a goal and a domain scan, simulates a user navigating
 * the site by repeatedly asking the LLM for the next page until goal_reached or max steps.
 */

import OpenAI from 'openai';
import type { DomainScanResult, ScanResult, JourneyStep, JourneyResult } from '@/lib/types';
import { OPENAI_MODEL, getOpenAIKey } from '@/lib/llm/config';

const MAX_STEPS = 15;
const MAX_REGIONS_PER_PAGE = 20;
const MAX_OUTBOUND_LINKS = 50;

function normalizeUrl(url: string): string {
    try {
        const u = new URL(url);
        return u.origin + (u.pathname.replace(/\/$/, '') || '');
    } catch {
        return url;
    }
}

export interface PageContext {
    url: string;
    title?: string;
    regions: Array<{ id: string; headingText: string; semanticType?: string }>;
    outboundLinks: string[];
}

/** Build a token-sparse page context for the LLM. */
export function buildPageContexts(domainResult: DomainScanResult): Map<string, PageContext> {
    const nodeIds = new Set((domainResult.graph?.nodes ?? []).map((n) => normalizeUrl(n.id)));
    const map = new Map<string, PageContext>();

    for (const page of domainResult.pages ?? []) {
        const urlNorm = normalizeUrl(page.url);
        const regions = (page.pageIndex?.regions ?? [])
            .slice(0, MAX_REGIONS_PER_PAGE)
            .map((r) => ({
                id: r.id,
                headingText: r.headingText,
                semanticType: r.semanticType,
            }));
        const allLinks = page.allLinks ?? [];
        const outboundLinks = allLinks
            .map((href) => {
                try {
                    return normalizeUrl(href);
                } catch {
                    return null;
                }
            })
            .filter((u): u is string => u !== null && nodeIds.has(u) && u !== urlNorm)
            .slice(0, MAX_OUTBOUND_LINKS);

        map.set(urlNorm, {
            url: page.url,
            title: page.seo?.title ?? undefined,
            regions,
            outboundLinks: [...new Set(outboundLinks)],
        });
    }
    return map;
}

/** Pick the start page: root (depth 0) or first by depth/URL. */
export function getStartPageUrl(domainResult: DomainScanResult): string | null {
    const nodes = domainResult.graph?.nodes ?? [];
    if (nodes.length === 0) return null;
    const byDepth = [...nodes].sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));
    const first = byDepth[0];
    return first ? normalizeUrl(first.url) : null;
}

function extractJsonFromResponse(content: string): string {
    const trimmed = content.trim();
    const codeBlock = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
    if (codeBlock) return codeBlock[1].trim();
    const firstBrace = trimmed.indexOf('{');
    if (firstBrace >= 0) {
        let depth = 0;
        let end = firstBrace;
        for (let i = firstBrace; i < trimmed.length; i++) {
            if (trimmed[i] === '{') depth++;
            else if (trimmed[i] === '}') {
                depth--;
                if (depth === 0) {
                    end = i + 1;
                    break;
                }
            }
        }
        return trimmed.slice(firstBrace, end);
    }
    return trimmed;
}

type AgentAction =
    | { action: 'next'; next_page_url: string; trigger_label?: string }
    | { action: 'goal_reached'; reason?: string };

function parseAgentResponse(content: string): AgentAction | null {
    try {
        const jsonStr = extractJsonFromResponse(content);
        const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
        const action = parsed?.action as string;
        if (action === 'goal_reached') {
            return { action: 'goal_reached', reason: parsed.reason as string | undefined };
        }
        if (action === 'next' && typeof parsed?.next_page_url === 'string') {
            return {
                action: 'next',
                next_page_url: parsed.next_page_url as string,
                trigger_label: typeof parsed.trigger_label === 'string' ? parsed.trigger_label : undefined,
            };
        }
    } catch {
        // ignore
    }
    return null;
}

const JOURNEY_SYSTEM_PROMPT = `You are simulating a user navigating a website. You have a goal. You can only navigate to pages that are in the "outboundLinks" list for the current page. Do not invent URLs.

Rules:
- Reply ONLY with a JSON object. No markdown, no explanation outside JSON.
- For each step you must choose exactly one of:
  1. action: "next" – go to a next page. You MUST set "next_page_url" to one of the URLs in "outboundLinks". Optionally set "trigger_label" (e.g. link text or region heading the user would click).
  2. action: "goal_reached" – the current page satisfies the goal. Optionally set "reason" (short explanation).

Example next: {"action": "next", "next_page_url": "https://example.com/products", "trigger_label": "Products"}
Example goal_reached: {"action": "goal_reached", "reason": "Product XY is on this page"}`;

function buildUserMessage(
    currentPage: PageContext,
    goal: string,
    pathSoFar: string[]
): string {
    return `Goal: ${goal}

Current page:
- url: ${currentPage.url}
- title: ${currentPage.title ?? '(no title)'}
- regions (headings/landmarks): ${JSON.stringify(currentPage.regions.map((r) => ({ id: r.id, text: r.headingText, type: r.semanticType })))}
- outboundLinks (you may only choose one of these as next_page_url): ${JSON.stringify(currentPage.outboundLinks)}

Path so far (URLs already visited): ${JSON.stringify(pathSoFar)}

Reply with one JSON object: either next (with next_page_url from outboundLinks and optional trigger_label) or goal_reached (with optional reason).`;
}

/** Resolve trigger_label to a region by best match on headingText; returns id and region metadata. */
function matchTriggerToRegion(
    page: ScanResult,
    triggerLabel: string | undefined
): { id: string; findabilityScore: number; aboveFold: boolean; semanticType?: string } | undefined {
    if (!triggerLabel?.trim() || !page.pageIndex?.regions?.length) return undefined;
    const label = triggerLabel.trim().toLowerCase();
    let best: { id: string; score: number; findabilityScore: number; aboveFold: boolean; semanticType?: string } | null = null;
    for (const r of page.pageIndex.regions) {
        const text = (r.headingText ?? '').toLowerCase();
        if (!text) continue;
        const score = text.includes(label) ? label.length : (label.includes(text) ? text.length : 0);
        if (score > 0 && (!best || score > best.score)) {
            best = {
                id: r.id,
                score,
                findabilityScore: r.findabilityScore ?? 0,
                aboveFold: r.aboveFold ?? false,
                semanticType: r.semanticType,
            };
        }
    }
    return best ? { id: best.id, findabilityScore: best.findabilityScore, aboveFold: best.aboveFold, semanticType: best.semanticType } : undefined;
}

export async function runJourneyAgent(
    openai: OpenAI,
    goal: string,
    domainResult: DomainScanResult
): Promise<JourneyResult> {
    const pageContexts = buildPageContexts(domainResult);
    const startUrl = getStartPageUrl(domainResult);
    if (!startUrl || !pageContexts.has(startUrl)) {
        return { steps: [], goalReached: false, message: 'No start page or empty scan.' };
    }

    const steps: JourneyStep[] = [];
    let currentUrl = startUrl;
    const pathSoFar: string[] = [startUrl];
    const pageByUrl = new Map(domainResult.pages.map((p) => [normalizeUrl(p.url), p]));

    const firstPage = pageContexts.get(startUrl)!;
    const firstScan = pageByUrl.get(startUrl);
    steps.push({
        pageUrl: firstScan?.url ?? firstPage.url,
        pageTitle: firstPage.title,
        index: 0,
    });

    for (let i = 0; i < MAX_STEPS - 1; i++) {
        const currentContext = pageContexts.get(currentUrl);
        if (!currentContext) break;

        const userMessage = buildUserMessage(currentContext, goal, pathSoFar);
        let rawContent: string;
        try {
            const completion = await openai.chat.completions.create({
                model: OPENAI_MODEL,
                messages: [
                    { role: 'system', content: JOURNEY_SYSTEM_PROMPT },
                    { role: 'user', content: userMessage },
                ],
            });
            rawContent = completion.choices[0]?.message?.content ?? '';
        } catch (e) {
            console.error('[CHECKION] journey agent: OpenAI error', e);
            return {
                steps,
                goalReached: false,
                message: e instanceof Error ? e.message : 'LLM request failed.',
            };
        }

        const action = parseAgentResponse(rawContent);
        if (!action) {
            return {
                steps,
                goalReached: false,
                message: 'Invalid or missing JSON in agent response.',
            };
        }

        if (action.action === 'goal_reached') {
            return {
                steps,
                goalReached: true,
                message: action.reason,
            };
        }

        const nextNorm = normalizeUrl(action.next_page_url);
        if (!currentContext.outboundLinks.includes(nextNorm)) {
            return {
                steps,
                goalReached: false,
                message: `Agent chose a URL not in outboundLinks: ${action.next_page_url}`,
            };
        }

        const nextContext = pageContexts.get(nextNorm);
        if (!nextContext) {
            return { steps, goalReached: false, message: 'Next page not in scan.' };
        }

        const currentScan = pageByUrl.get(currentUrl);
        const region = currentScan
            ? matchTriggerToRegion(currentScan, action.trigger_label)
            : undefined;

        const nextScan = pageByUrl.get(nextNorm);
        steps.push({
            pageUrl: nextScan?.url ?? nextContext.url,
            pageTitle: nextContext.title,
            triggerLabel: action.trigger_label,
            regionId: region?.id,
            regionFindability: region?.findabilityScore,
            regionAboveFold: region?.aboveFold,
            regionSemanticType: region?.semanticType,
            index: steps.length,
        });
        pathSoFar.push(nextNorm);
        currentUrl = nextNorm;
    }

    return {
        steps,
        goalReached: false,
        message: 'Max steps reached.',
    };
}
