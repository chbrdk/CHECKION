/**
 * User Journey Agent: given a goal and a domain scan, simulates a user navigating
 * the site by repeatedly asking the LLM for the next page until goal_reached or max steps.
 */

import OpenAI from 'openai';
import type { DomainScanResult, ScanResult, JourneyStep, JourneyResult } from '@/lib/types';
import { OPENAI_MODEL, getOpenAIKey } from '@/lib/llm/config';

const MAX_STEPS = 15;
const MAX_TURNS = 35; // LLM calls (advances + backtrack re-tries)
const MAX_REGIONS_PER_PAGE = 20;
const MAX_OUTBOUND_LINKS = 50;

const DEBUG_JOURNEY = process.env.DEBUG_JOURNEY === '1' || process.env.DEBUG_JOURNEY === 'true';

function debugJourney(label: string, data: unknown): void {
    if (!DEBUG_JOURNEY) return;
    console.log('[CHECKION journey]', label, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
}

function normalizeUrl(url: string): string {
    try {
        const u = new URL(url);
        return u.origin + (u.pathname.replace(/\/$/, '') || '');
    } catch {
        return url;
    }
}

/** Canonical key: same host (www stripped) + path – so www and non-www match. */
function canonicalKey(url: string): string | null {
    try {
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./i, '');
        const path = (u.pathname.replace(/\/$/, '') || '');
        return host + path;
    } catch {
        return null;
    }
}

export interface PageContext {
    url: string;
    title?: string;
    /** Short page description (SEO) for content evaluation. */
    description?: string;
    regions: Array<{ id: string; headingText: string; semanticType?: string }>;
    outboundLinks: string[];
}

/** Build a token-sparse page context for the LLM. Uses canonical matching (www = non-www) so start page links find scanned pages. */
export function buildPageContexts(domainResult: DomainScanResult): Map<string, PageContext> {
    const nodes = domainResult.graph?.nodes ?? [];
    const nodeIds = new Set(nodes.map((n) => normalizeUrl(n.id)));
    const canonicalToStoredUrl = new Map<string, string>();
    for (const n of nodes) {
        const norm = normalizeUrl(n.id);
        const key = canonicalKey(norm);
        if (key != null) canonicalToStoredUrl.set(key, norm);
    }

    const map = new Map<string, PageContext>();

    for (const page of domainResult.pages ?? []) {
        const urlNorm = normalizeUrl(page.url);
        const urlCanon = canonicalKey(urlNorm);
        const regions = (page.pageIndex?.regions ?? [])
            .slice(0, MAX_REGIONS_PER_PAGE)
            .map((r) => ({
                id: r.id,
                headingText: r.headingText,
                semanticType: r.semanticType,
            }));
        const allLinks = page.allLinks ?? [];
        const seen = new Set<string>();
        const outboundLinks: string[] = [];
        for (const href of allLinks) {
            let norm: string;
            try {
                norm = normalizeUrl(href);
            } catch {
                continue;
            }
            if (norm === urlNorm) continue;
            const key = canonicalKey(norm);
            const storedUrl = key != null ? canonicalToStoredUrl.get(key) : null;
            if (storedUrl != null && !seen.has(storedUrl)) {
                seen.add(storedUrl);
                outboundLinks.push(storedUrl);
            } else if (nodeIds.has(norm) && !seen.has(norm)) {
                seen.add(norm);
                outboundLinks.push(norm);
            }
            if (outboundLinks.length >= MAX_OUTBOUND_LINKS) break;
        }

        map.set(urlNorm, {
            url: page.url,
            title: page.seo?.title ?? undefined,
            description: page.seo?.metaDescription ?? undefined,
            regions,
            outboundLinks,
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
    | { action: 'goal_reached'; reason?: string }
    | { action: 'goal_not_found'; reason: string };

function parseAgentResponse(content: string): AgentAction | null {
    try {
        const jsonStr = extractJsonFromResponse(content);
        const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
        const action = parsed?.action as string;
        if (action === 'goal_reached') {
            return { action: 'goal_reached', reason: parsed.reason as string | undefined };
        }
        if (action === 'goal_not_found') {
            const reason = typeof parsed.reason === 'string' ? parsed.reason : 'Ziel nicht gefunden.';
            return { action: 'goal_not_found', reason };
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

const JOURNEY_SYSTEM_PROMPT = `You are simulating a user navigating a website. Your job is to evaluate each page fully and then choose the next action.

Process for EVERY step:
1. Evaluate the FULL page content: title, description, and all regions (headings/landmarks). Use this to decide where the goal is most likely to be.
2. If the goal is clearly satisfied by the current page content, reply with action "goal_reached" and a short "reason".
3. If you can move toward the goal, choose the best link from "outboundLinks" (only these URLs are reachable in this scan). Reply with action "next", "next_page_url" (must be exactly one URL from outboundLinks), and optionally "trigger_label" (link text or region the user would click).
4. If you cannot reach the goal from here – e.g. outboundLinks is empty, or none of the links lead toward the goal – reply with action "goal_not_found" and a short "reason" (e.g. "Auf dieser Seite sind keine ausgehenden Links zu gescannten Seiten" or "Kein Link führt zum Ziel").

Rules:
- Reply ONLY with a single JSON object. No markdown, no text outside JSON.
- You may ONLY set "next_page_url" to a URL that appears in "outboundLinks". Do not invent URLs.
- Use "goal_reached" only when the current page actually satisfies the goal. Use "goal_not_found" when the goal cannot be reached (e.g. no navigable links, or dead end).
- If "alreadyTried" is given: do NOT choose any of those URLs as next_page_url (they led to dead ends). Pick a different link from outboundLinks or goal_not_found.

Examples:
{"action": "next", "next_page_url": "https://example.com/products", "trigger_label": "Products"}
{"action": "goal_reached", "reason": "Product XY is on this page"}
{"action": "goal_not_found", "reason": "Auf dieser Seite sind keine ausgehenden Links vorhanden; Ziel nicht erreichbar."}`;

function buildUserMessage(
    currentPage: PageContext,
    goal: string,
    pathSoFar: string[],
    alreadyTriedFromThisPage: string[] = []
): string {
    const hasLinks = currentPage.outboundLinks.length > 0;
    const remainingLinks = alreadyTriedFromThisPage.length > 0
        ? currentPage.outboundLinks.filter((u) => !alreadyTriedFromThisPage.includes(u))
        : currentPage.outboundLinks;
    const linkHint = hasLinks
        ? remainingLinks.length > 0
            ? `Choose exactly one URL from outboundLinks as next_page_url (do not choose any URL in alreadyTried), or goal_reached/goal_not_found.`
            : `All relevant links from this page have already been tried without success. Reply with action "goal_not_found" and a short reason.`
        : `outboundLinks is empty – you cannot navigate to another page. Reply with action "goal_not_found" and a short reason (e.g. no navigable links, or goal not on this page).`;

    const triedLine = alreadyTriedFromThisPage.length > 0
        ? `- alreadyTried (from this page – led to dead end; do not choose again): ${JSON.stringify(alreadyTriedFromThisPage)}\n`
        : '';

    return `Goal: ${goal}

Current page (evaluate this full content to decide):
- url: ${currentPage.url}
- title: ${currentPage.title ?? '(no title)'}
- description: ${currentPage.description ?? '(none)'}
- regions (headings/landmarks – structure of the page): ${JSON.stringify(currentPage.regions.map((r) => ({ id: r.id, text: r.headingText, type: r.semanticType })))}
- outboundLinks (only these URLs are reachable; you may only use one as next_page_url): ${JSON.stringify(currentPage.outboundLinks)}
${triedLine}
Path so far (URLs already visited): ${JSON.stringify(pathSoFar)}

${linkHint}

Reply with one JSON object: "next" (next_page_url + optional trigger_label), "goal_reached" (optional reason), or "goal_not_found" (reason required).`;
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

    debugJourney('START', {
        goal,
        startUrl,
        totalPages: pageContexts.size,
        pageUrls: Array.from(pageContexts.keys()).slice(0, 20),
    });
    debugJourney('SYSTEM_PROMPT', JOURNEY_SYSTEM_PROMPT);

    const steps: JourneyStep[] = [];
    let currentUrl = startUrl;
    const pathSoFar: string[] = [startUrl];
    const triedFromPage = new Map<string, Set<string>>(); // page URL -> set of next_page_url we tried and led to dead end
    const pageByUrl = new Map(domainResult.pages.map((p) => [normalizeUrl(p.url), p]));

    const firstPage = pageContexts.get(startUrl)!;
    const firstScan = pageByUrl.get(startUrl);
    steps.push({
        pageUrl: firstScan?.url ?? firstPage.url,
        pageTitle: firstPage.title,
        index: 0,
    });

    let totalTurns = 0;
    while (totalTurns < MAX_TURNS) {
        totalTurns++;
        const currentContext = pageContexts.get(currentUrl);
        if (!currentContext) break;

        const alreadyTried = Array.from(triedFromPage.get(currentUrl) ?? []);
        const userMessage = buildUserMessage(currentContext, goal, pathSoFar, alreadyTried);
        debugJourney(`TURN ${totalTurns} REQUEST`, {
            currentUrl,
            pathSoFar,
            alreadyTried,
            currentTitle: currentContext.title,
            outboundLinksCount: currentContext.outboundLinks.length,
            outboundLinks: currentContext.outboundLinks.slice(0, 15),
            userMessage,
        });
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
        debugJourney(`TURN ${totalTurns} RESPONSE (raw)`, rawContent);
        const action = parseAgentResponse(rawContent);
        debugJourney(`TURN ${totalTurns} PARSED ACTION`, action);
        if (!action) {
            return {
                steps,
                goalReached: false,
                message: 'Invalid or missing JSON in agent response.',
            };
        }

        if (action.action === 'goal_reached') {
            debugJourney('DONE goal_reached', { steps: steps.length, reason: action.reason });
            return {
                steps,
                goalReached: true,
                message: action.reason,
            };
        }

        if (action.action === 'goal_not_found') {
            if (pathSoFar.length > 1) {
                debugJourney('BACKTRACK', { from: currentUrl, to: pathSoFar[pathSoFar.length - 2] });
                const failedUrl = currentUrl;
                const previousUrl = pathSoFar[pathSoFar.length - 2];
                if (!triedFromPage.has(previousUrl)) triedFromPage.set(previousUrl, new Set());
                triedFromPage.get(previousUrl)!.add(failedUrl);
                steps.pop();
                pathSoFar.pop();
                currentUrl = pathSoFar[pathSoFar.length - 1];
                continue;
            }
            debugJourney('DONE goal_not_found', { steps: steps.length, reason: action.reason });
            return {
                steps,
                goalReached: false,
                message: action.reason,
            };
        }

        const nextNorm = normalizeUrl(action.next_page_url);
        debugJourney('NEXT', { next_page_url: nextNorm, trigger_label: action.trigger_label });
        if (triedFromPage.get(currentUrl)?.has(nextNorm)) {
            return {
                steps,
                goalReached: false,
                message: 'Agent chose an already-tried link (backtrack and pick another).',
            };
        }
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

        if (steps.length >= MAX_STEPS) {
            debugJourney('DONE max_steps_reached', { steps: steps.length });
            return { steps, goalReached: false, message: 'Max steps reached.' };
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

    debugJourney('DONE max_turns_reached', { steps: steps.length });
    return {
        steps,
        goalReached: false,
        message: 'Max turns reached.',
    };
}

export type JourneyStreamEvent =
    | { type: 'step'; step: JourneyStep }
    | { type: 'done'; result: JourneyResult }
    | { type: 'error'; message: string };

/** Async generator that yields each step and finally the result (for streaming UI). */
export async function* runJourneyAgentStream(
    openai: OpenAI,
    goal: string,
    domainResult: DomainScanResult
): AsyncGenerator<JourneyStreamEvent, void, unknown> {
    const pageContexts = buildPageContexts(domainResult);
    const startUrl = getStartPageUrl(domainResult);
    if (!startUrl || !pageContexts.has(startUrl)) {
        yield { type: 'done', result: { steps: [], goalReached: false, message: 'No start page or empty scan.' } };
        return;
    }

    debugJourney('STREAM START', { goal, startUrl, totalPages: pageContexts.size });
    debugJourney('SYSTEM_PROMPT', JOURNEY_SYSTEM_PROMPT);

    const steps: JourneyStep[] = [];
    let currentUrl = startUrl;
    const pathSoFar: string[] = [startUrl];
    const triedFromPage = new Map<string, Set<string>>();
    const pageByUrl = new Map(domainResult.pages.map((p) => [normalizeUrl(p.url), p]));

    const firstPage = pageContexts.get(startUrl)!;
    const firstScan = pageByUrl.get(startUrl);
    const firstStep: JourneyStep = {
        pageUrl: firstScan?.url ?? firstPage.url,
        pageTitle: firstPage.title,
        index: 0,
    };
    steps.push(firstStep);
    yield { type: 'step', step: firstStep };

    let totalTurns = 0;
    while (totalTurns < MAX_TURNS) {
        totalTurns++;
        const currentContext = pageContexts.get(currentUrl);
        if (!currentContext) break;

        const alreadyTried = Array.from(triedFromPage.get(currentUrl) ?? []);
        const userMessage = buildUserMessage(currentContext, goal, pathSoFar, alreadyTried);
        debugJourney(`STREAM TURN ${totalTurns} REQUEST`, {
            currentUrl,
            pathSoFar,
            alreadyTried,
            outboundLinksCount: currentContext.outboundLinks.length,
            outboundLinks: currentContext.outboundLinks.slice(0, 15),
            userMessage,
        });
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
            const msg = e instanceof Error ? e.message : 'LLM request failed.';
            yield { type: 'error', message: msg };
            yield { type: 'done', result: { steps, goalReached: false, message: msg } };
            return;
        }
        debugJourney(`STREAM TURN ${totalTurns} RESPONSE (raw)`, rawContent);
        const action = parseAgentResponse(rawContent);
        debugJourney(`STREAM TURN ${totalTurns} PARSED ACTION`, action);
        if (!action) {
            yield { type: 'done', result: { steps, goalReached: false, message: 'Invalid or missing JSON in agent response.' } };
            return;
        }

        if (action.action === 'goal_reached') {
            debugJourney('STREAM DONE goal_reached', { reason: action.reason });
            yield { type: 'done', result: { steps, goalReached: true, message: action.reason } };
            return;
        }

        if (action.action === 'goal_not_found') {
            if (pathSoFar.length > 1) {
                debugJourney('STREAM BACKTRACK', { from: currentUrl, to: pathSoFar[pathSoFar.length - 2] });
                const failedUrl = currentUrl;
                const previousUrl = pathSoFar[pathSoFar.length - 2];
                if (!triedFromPage.has(previousUrl)) triedFromPage.set(previousUrl, new Set());
                triedFromPage.get(previousUrl)!.add(failedUrl);
                steps.pop();
                pathSoFar.pop();
                currentUrl = pathSoFar[pathSoFar.length - 1];
                continue;
            }
            debugJourney('STREAM DONE goal_not_found', { reason: action.reason });
            yield { type: 'done', result: { steps, goalReached: false, message: action.reason } };
            return;
        }

        const nextNorm = normalizeUrl(action.next_page_url);
        debugJourney('STREAM NEXT', { next_page_url: nextNorm, trigger_label: action.trigger_label });
        if (triedFromPage.get(currentUrl)?.has(nextNorm)) {
            yield { type: 'done', result: { steps, goalReached: false, message: 'Agent chose an already-tried link (backtrack and pick another).' } };
            return;
        }
        if (!currentContext.outboundLinks.includes(nextNorm)) {
            yield { type: 'done', result: { steps, goalReached: false, message: `Agent chose a URL not in outboundLinks: ${action.next_page_url}` } };
            return;
        }

        const nextContext = pageContexts.get(nextNorm);
        if (!nextContext) {
            yield { type: 'done', result: { steps, goalReached: false, message: 'Next page not in scan.' } };
            return;
        }

        if (steps.length >= MAX_STEPS) {
            debugJourney('STREAM DONE max_steps_reached', { steps: steps.length });
            yield { type: 'done', result: { steps, goalReached: false, message: 'Max steps reached.' } };
            return;
        }

        const currentScan = pageByUrl.get(currentUrl);
        const region = currentScan ? matchTriggerToRegion(currentScan, action.trigger_label) : undefined;
        const nextScan = pageByUrl.get(nextNorm);
        const step: JourneyStep = {
            pageUrl: nextScan?.url ?? nextContext.url,
            pageTitle: nextContext.title,
            triggerLabel: action.trigger_label,
            regionId: region?.id,
            regionFindability: region?.findabilityScore,
            regionAboveFold: region?.aboveFold,
            regionSemanticType: region?.semanticType,
            index: steps.length,
        };
        steps.push(step);
        pathSoFar.push(nextNorm);
        currentUrl = nextNorm;
        yield { type: 'step', step };
    }

    debugJourney('STREAM DONE max_turns_reached', { steps: steps.length });
    yield { type: 'done', result: { steps, goalReached: false, message: 'Max turns reached.' } };
}
