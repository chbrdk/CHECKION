/**
 * User Journey Agent: given a goal and a domain scan, simulates a user navigating
 * the site by repeatedly asking the LLM for the next page until goal_reached or max steps.
 */

import OpenAI from 'openai';
import type { DomainScanResultWithFullPages, ScanResult, JourneyStep, JourneyResult } from '@/lib/types';
import { OPENAI_MODEL, getOpenAIKey } from '@/lib/llm/config';

const MAX_STEPS = 15;
const MAX_TURNS = 35; // LLM calls (advances + backtrack re-tries)
const MAX_REGIONS_PER_PAGE = 20;
const MAX_OUTBOUND_LINKS = 50;

function debugJourney(label: string, data: unknown): void {
    const out = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    console.log('[CHECKION journey]', label);
    console.log(out);
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
    /** Plain-text excerpt of the page body (indexed for journey). Enables goal_reached when goal appears in paragraphs, not only in links/headings. */
    bodyTextExcerpt?: string;
    regions: Array<{
        id: string;
        headingText: string;
        semanticType?: string;
        /** Plain-text content of this section (attention zone). */
        textSnippet?: string;
        /** Links inside this section. */
        links?: Array<{ href: string; text: string }>;
    }>;
    outboundLinks: string[];
    /** Link text per outbound URL for semantic search (from allLinksWithLabels). */
    outboundLinksWithLabels?: Array<{ url: string; text: string }>;
}

/** Build a token-sparse page context for the LLM. Uses canonical matching (www = non-www) so start page links find scanned pages. */
export function buildPageContexts(domainResult: DomainScanResultWithFullPages): Map<string, PageContext> {
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
                textSnippet: r.textSnippet?.slice(0, 1200),
                links: r.links?.length ? r.links.slice(0, 25) : undefined,
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

        const labelsByUrl = new Map<string, string>();
        for (const { href, text } of page.allLinksWithLabels ?? []) {
            try {
                const norm = normalizeUrl(href);
                const key = canonicalKey(norm);
                const stored = key != null ? canonicalToStoredUrl.get(key) : null;
                if (stored != null && outboundLinks.includes(stored) && !labelsByUrl.has(stored))
                    labelsByUrl.set(stored, (text || '').slice(0, 100).trim() || href);
            } catch {
                /* skip */
            }
        }
        const outboundLinksWithLabels = outboundLinks.map((u) => ({
            url: u,
            text: labelsByUrl.get(u) ?? u,
        }));

        map.set(urlNorm, {
            url: page.url,
            title: page.seo?.title ?? undefined,
            description: page.seo?.metaDescription ?? undefined,
            bodyTextExcerpt: page.bodyTextExcerpt ?? undefined,
            regions,
            outboundLinks,
            outboundLinksWithLabels,
        });
    }

    // Diagnose: Seiten mit 0 outbound obwohl allLinks vorhanden (Matching-Problem) oder Startseiten-Kandidaten
    const startCandidate = nodes.length > 0
        ? normalizeUrl(([...nodes].sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0))[0].url))
        : null;
    const emptyButHasLinks = Array.from(map.entries()).filter(
        ([urlNorm, ctx]) => ctx.outboundLinks.length === 0 && (domainResult.pages ?? []).some((p) => normalizeUrl(p.url) === urlNorm && (p.allLinks?.length ?? 0) > 0)
    );
    const forStart = startCandidate != null && map.get(startCandidate)?.outboundLinks.length === 0;
    if (emptyButHasLinks.length > 0 || forStart) {
        const pageUrlNorm = forStart ? startCandidate! : emptyButHasLinks[0][0];
        const page = (domainResult.pages ?? []).find((p) => normalizeUrl(p.url) === pageUrlNorm);
        const rawLinks = page?.allLinks ?? [];
        const sampleLinks = rawLinks.slice(0, 25).map((href) => {
            try {
                const n = normalizeUrl(href);
                return { href, normalized: n, canonicalKey: canonicalKey(n) };
            } catch {
                return { href, normalized: null, canonicalKey: null };
            }
        });
        const storedKeys = Array.from(canonicalToStoredUrl.keys()).slice(0, 40);
        const matchCount = rawLinks.filter((href) => {
            try {
                const n = normalizeUrl(href);
                const key = canonicalKey(n);
                return key != null && canonicalToStoredUrl.has(key);
            } catch {
                return false;
            }
        }).length;
        debugJourney('DIAG: 0 outboundLinks (start or had links)', {
            pageUrl: pageUrlNorm,
            isStartPage: forStart ?? false,
            allLinksCount: rawLinks.length,
            howManyWouldMatch: matchCount,
            sampleLinksFromPage: sampleLinks,
            sampleStoredCanonicalKeys: storedKeys,
        });
    }

    return map;
}

/** Pick the start page: root (depth 0) or first by depth/URL. */
export function getStartPageUrl(domainResult: DomainScanResultWithFullPages): string | null {
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

const JOURNEY_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'get_page_content',
            description: 'Get the full text content (body) of the current page. Use this to check if the goal is mentioned in paragraphs or body text, not only in links or headings. If the goal appears in the content, call goal_reached.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_sections',
            description: 'Get the page split into sections (attention zones): each section has heading, optional text snippet, and links inside that section. Use this to see which zone contains the goal or which links belong to which section.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'search_on_page',
            description: 'Search the current page for links most relevant to the goal. Returns ranked links (url, label, reason). Use this first, then navigate_to one of the returned URLs or goal_reached/goal_not_found.',
            parameters: {
                type: 'object',
                properties: { query: { type: 'string', description: 'Search query (e.g. goal or part of it like "2011", "Magazin")' } },
                required: ['query'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'navigate_to',
            description: 'Navigate to a URL. Only allowed if the URL was returned by search_on_page for this page. Pass the link_label and reason from the search result so the journey can show why this link was chosen.',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'Full URL to navigate to (must be in current page outbound links)' },
                    link_label: { type: 'string', description: 'Link text from search_on_page (what the user would see)' },
                    reason: { type: 'string', description: 'Why this link was chosen (e.g. "Link text matches", "URL path matches" from search_on_page, or your short explanation)' },
                },
                required: ['url'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'goal_reached',
            description: 'Call when the current page satisfies the goal.',
            parameters: {
                type: 'object',
                properties: { reason: { type: 'string', description: 'Short explanation' } },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'goal_not_found',
            description: 'Call when the goal cannot be reached from here (e.g. no relevant links, or all led to dead ends).',
            parameters: {
                type: 'object',
                properties: { reason: { type: 'string', description: 'Short explanation' } },
                required: ['reason'],
            },
        },
    },
];

const SEARCH_TOP_N = 10;

/** Keyword-based relevance: score URL path, link label, and region headings against query. */
function searchOnPage(
    currentPage: PageContext,
    query: string,
    alreadyTried: string[]
): Array<{ url: string; label: string; reason?: string }> {
    const q = query.trim().toLowerCase();
    if (!q) return currentPage.outboundLinks.slice(0, SEARCH_TOP_N).map((url) => ({
        url,
        label: currentPage.outboundLinksWithLabels?.find((l) => l.url === url)?.text ?? url,
    }));

    const scored = currentPage.outboundLinks
        .filter((url) => !alreadyTried.includes(url))
        .map((url) => {
            const label = currentPage.outboundLinksWithLabels?.find((l) => l.url === url)?.text ?? url;
            let score = 0;
            const reasons: string[] = [];
            try {
                const path = new URL(url).pathname.toLowerCase();
                if (path.includes(q)) {
                    score += 10;
                    reasons.push('URL path matches');
                }
            } catch {
                /* ignore */
            }
            if (label.toLowerCase().includes(q)) {
                score += 15;
                reasons.push('Link text matches');
            }
            for (const r of currentPage.regions) {
                if ((r.headingText || '').toLowerCase().includes(q)) {
                    score += 5;
                    reasons.push('Region heading matches');
                    break;
                }
            }
            return { url, label, score, reason: reasons.join('; ') || undefined };
        })
        .filter((x) => x.score >= 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, SEARCH_TOP_N)
        .map(({ url, label, reason }) => ({ url, label, reason }));

    if (scored.length === 0 && currentPage.outboundLinks.some((u) => !alreadyTried.includes(u))) {
        return currentPage.outboundLinks
            .filter((u) => !alreadyTried.includes(u))
            .slice(0, SEARCH_TOP_N)
            .map((url) => ({
                url,
                label: currentPage.outboundLinksWithLabels?.find((l) => l.url === url)?.text ?? url,
                reason: 'No keyword match; showing available links',
            }));
    }
    return scored;
}

const JOURNEY_TOOL_SYSTEM_PROMPT = `You are simulating a user navigating a website to reach a goal. Use the tools in order:

1. get_page_content(): Call to read the full text (body) of the current page. The goal might be mentioned in a paragraph or section, not only in link text or headings. If the content clearly satisfies the goal, call goal_reached.
2. get_sections(): Get the page split into sections (attention zones). Each section has heading, optional text snippet, and links in that zone. Use to see which section contains the goal or which links belong to which area.
3. search_on_page(query): Search the current page for links relevant to the goal. Use the goal or part of it (e.g. "2011", "Magazin") as query. It returns only links you have NOT yet tried from this page.
4. Then either:
   - navigate_to(url, link_label, reason): Click one of the URLs returned by search_on_page. Always pass link_label and reason. You may ONLY use a URL that appears in the search_on_page result.
   - goal_reached(reason): The current page satisfies the goal.
   - goal_not_found(reason): The goal cannot be reached from here (no relevant links or dead end). If you backtrack, this reason explains why you left the next page.

Critical – avoid endless loops:
- If you just backtracked, you are back on the previous page because the link you took did NOT contain the goal. You MUST choose a different link now: pick the next best option from search_on_page (never the same URL again). search_on_page only returns links you have not tried from this page; use one of those.
- If "alreadyTriedFromThisPage" is given in the user message, those URLs led to dead ends. Do NOT call navigate_to with any of them. Choose only from the list returned by search_on_page.
- If search_on_page returns an empty list, all links from this page have been tried; call goal_not_found.
- Prefer calling get_page_content() when you need to decide if the current page already satisfies the goal (e.g. "awards" might be in a paragraph on Über uns, not only in a link).

Rules:
- Always pass link_label and reason in navigate_to. If you get "Already tried this link", pick a different URL from your last search_on_page result.
- Prefer calling search_on_page first, then navigate_to or goal_* based on the result.`;

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

type ToolCallHandler = (
    name: string,
    args: Record<string, unknown>,
    currentContext: PageContext,
    currentUrl: string,
    pageContexts: Map<string, PageContext>,
    pageByUrl: Map<string, ScanResult>,
    steps: JourneyStep[],
    pathSoFar: string[],
    triedFromPage: Map<string, Set<string>>
) => { result: unknown; navigated?: boolean; returnResult?: JourneyResult };

function executeToolCall(
    name: string,
    args: Record<string, unknown>,
    currentContext: PageContext,
    currentUrl: string,
    pageContexts: Map<string, PageContext>,
    pageByUrl: Map<string, ScanResult>,
    steps: JourneyStep[],
    pathSoFar: string[],
    triedFromPage: Map<string, Set<string>>
): { result: unknown; navigated?: boolean; returnResult?: JourneyResult } {
    const alreadyTried = Array.from(triedFromPage.get(currentUrl) ?? []);
    if (name === 'get_page_content') {
        const text = currentContext.bodyTextExcerpt;
        if (text) {
            return { result: { content: text, note: 'This is the plain-text body of the current page. If the goal appears here, call goal_reached.' } };
        }
        return { result: { content: null, note: 'No body text indexed for this page. Use title, description, and regions to evaluate.' } };
    }
    if (name === 'get_sections') {
        const sections = currentContext.regions.map((r) => ({
            heading: r.headingText,
            type: r.semanticType,
            textSnippet: r.textSnippet ?? undefined,
            links: r.links?.length ? r.links : undefined,
        }));
        return { result: sections };
    }
    if (name === 'search_on_page') {
        const query = typeof args.query === 'string' ? args.query : '';
        const list = searchOnPage(currentContext, query, alreadyTried);
        debugJourney('TOOL search_on_page', { query, resultsCount: list.length });
        return { result: list };
    }
    if (name === 'navigate_to') {
        const urlArg = args.url;
        if (typeof urlArg !== 'string') return { result: { error: 'Missing url' } };
        const nextNorm = normalizeUrl(urlArg);
        if (!currentContext.outboundLinks.includes(nextNorm)) {
            return { result: { error: 'URL not in outbound links', allowed: currentContext.outboundLinks.slice(0, 5) } };
        }
        if (triedFromPage.get(currentUrl)?.has(nextNorm)) {
            const remaining = searchOnPage(currentContext, '', alreadyTried);
            return {
                result: {
                    error: 'Already tried this link – that page did not contain the goal. Pick the next best URL from your last search_on_page result (or call search_on_page again).',
                    remainingFromThisPage: remaining.slice(0, 8).map((r) => ({ url: r.url, label: r.label })),
                },
            };
        }
        const nextContext = pageContexts.get(nextNorm);
        if (!nextContext) return { result: { error: 'Page not in scan' } };
        if (steps.length >= MAX_STEPS) return { result: { error: 'Max steps reached' } };
        const nextScan = pageByUrl.get(nextNorm);
        const linkLabel = typeof args.link_label === 'string' ? args.link_label.trim() || undefined : undefined;
        const reason = typeof args.reason === 'string' ? args.reason.trim() || undefined : undefined;
        const triggerLabel = linkLabel ?? currentContext.outboundLinksWithLabels?.find((l) => l.url === nextNorm)?.text;
        steps.push({
            pageUrl: nextScan?.url ?? nextContext.url,
            pageTitle: nextContext.title,
            triggerLabel,
            navigationReason: reason,
            index: steps.length,
        });
        pathSoFar.push(nextNorm);
        debugJourney('TOOL navigate_to', { url: nextNorm, reason, triggerLabel });
        return { result: { success: true, url: nextNorm }, navigated: true };
    }
    if (name === 'goal_reached') {
        const reason = typeof args.reason === 'string' ? args.reason : undefined;
        debugJourney('TOOL goal_reached', { reason });
        return { result: { success: true }, returnResult: { steps, goalReached: true, message: reason } };
    }
    if (name === 'goal_not_found') {
        const reason = typeof args.reason === 'string' ? args.reason : 'Goal not found.';
        if (pathSoFar.length > 1) {
            const previousUrl = pathSoFar[pathSoFar.length - 2];
            if (!triedFromPage.has(previousUrl)) triedFromPage.set(previousUrl, new Set());
            triedFromPage.get(previousUrl)!.add(currentUrl);
            steps.pop();
            pathSoFar.pop();
            const lastStep = steps[steps.length - 1];
            if (lastStep) lastStep.backtrackFromReason = reason;
            debugJourney('TOOL goal_not_found (backtrack)', { to: previousUrl, reason });
            return { result: { backtracked: true, reason }, navigated: true };
        }
        debugJourney('TOOL goal_not_found', { reason });
        return { result: { success: false, reason }, returnResult: { steps, goalReached: false, message: reason } };
    }
    return { result: { error: 'Unknown tool' } };
}

export async function runJourneyAgent(
    openai: OpenAI,
    goal: string,
    domainResult: DomainScanResultWithFullPages
): Promise<JourneyResult> {
    const pageContexts = buildPageContexts(domainResult);
    const startUrl = getStartPageUrl(domainResult);
    if (!startUrl || !pageContexts.has(startUrl)) {
        return { steps: [], goalReached: false, message: 'No start page or empty scan.' };
    }

    debugJourney('START', { goal, startUrl, totalPages: pageContexts.size });
    debugJourney('SYSTEM_PROMPT', JOURNEY_TOOL_SYSTEM_PROMPT);

    const steps: JourneyStep[] = [];
    let currentUrl = startUrl;
    const pathSoFar: string[] = [startUrl];
    const triedFromPage = new Map<string, Set<string>>();
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
        const alreadyTriedLine = alreadyTried.length > 0
            ? `\nAlready tried from this page (do NOT navigate to these again – they did not contain the goal): ${alreadyTried.map((u) => {
                const label = currentContext.outboundLinksWithLabels?.find((l) => l.url === u)?.text;
                const title = pageContexts.get(u)?.title;
                const desc = [label, title].filter(Boolean).join(' | ') || u;
                return `${desc} (${u})`;
            }).join('; ')}\n`
            : '';
        const userContent = `Goal: ${goal}\n\nCurrent page: ${currentContext.url}\nTitle: ${currentContext.title ?? '(none)'}\nPath so far: ${pathSoFar.length} pages.${alreadyTriedLine}\nUse search_on_page to find relevant links, then navigate_to one of them (only URLs from the result), or goal_reached/goal_not_found.`;
        type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;
        let messages: Message[] = [
            { role: 'system', content: JOURNEY_TOOL_SYSTEM_PROMPT },
            { role: 'user', content: userContent },
        ];

        let done = false;
        let journeyResult: JourneyResult | null = null;
        while (!done) {
            let completion: OpenAI.Chat.Completions.ChatCompletion;
            try {
                completion = await openai.chat.completions.create({
                    model: OPENAI_MODEL,
                    messages,
                    tools: JOURNEY_TOOLS,
                    tool_choice: 'auto',
                });
            } catch (e) {
                console.error('[CHECKION] journey agent: OpenAI error', e);
                return { steps, goalReached: false, message: e instanceof Error ? e.message : 'LLM request failed.' };
            }

            const msg = completion.choices[0]?.message;
            if (!msg) {
                return { steps, goalReached: false, message: 'No message from model.' };
            }

            if (!msg.tool_calls?.length) {
                const rawContent = typeof msg.content === 'string' ? msg.content : '';
                const action = parseAgentResponse(rawContent);
                if (action?.action === 'goal_reached') {
                    return { steps, goalReached: true, message: action.reason };
                }
                if (action?.action === 'goal_not_found') {
                    if (pathSoFar.length > 1) {
                        const previousUrl = pathSoFar[pathSoFar.length - 2];
                        if (!triedFromPage.has(previousUrl)) triedFromPage.set(previousUrl, new Set());
                        triedFromPage.get(previousUrl)!.add(currentUrl);
                        steps.pop();
                        pathSoFar.pop();
                        const lastStep = steps[steps.length - 1];
                        if (lastStep) lastStep.backtrackFromReason = action.reason;
                        currentUrl = pathSoFar[pathSoFar.length - 1];
                        done = true;
                        continue;
                    }
                    return { steps, goalReached: false, message: action.reason };
                }
                if (action?.action === 'next') {
                    const nextNorm = normalizeUrl(action.next_page_url);
                    if (currentContext.outboundLinks.includes(nextNorm) && !triedFromPage.get(currentUrl)?.has(nextNorm)) {
                        const nextContext = pageContexts.get(nextNorm);
                        if (nextContext && steps.length < MAX_STEPS) {
                            const nextScan = pageByUrl.get(nextNorm);
                            steps.push({
                                pageUrl: nextScan?.url ?? nextContext.url,
                                pageTitle: nextContext.title,
                                triggerLabel: action.trigger_label,
                                index: steps.length,
                            });
                            pathSoFar.push(nextNorm);
                            currentUrl = nextNorm;
                        }
                    }
                }
                done = true;
                break;
            }

            messages = [...messages, { role: 'assistant', content: msg.content ?? null, tool_calls: msg.tool_calls }];
            let navigated = false;
            for (const tc of msg.tool_calls) {
                const fn = 'function' in tc ? tc.function : undefined;
                const name = fn?.name ?? '';
                let args: Record<string, unknown> = {};
                try {
                    args = JSON.parse(typeof fn?.arguments === 'string' ? fn.arguments : '{}') as Record<string, unknown>;
                } catch {
                    /* ignore */
                }
                const out = executeToolCall(
                    name,
                    args,
                    currentContext,
                    currentUrl,
                    pageContexts,
                    pageByUrl,
                    steps,
                    pathSoFar,
                    triedFromPage
                );
                messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(out.result) });
                if (out.returnResult) {
                    return out.returnResult;
                }
                if (out.navigated) {
                    currentUrl = pathSoFar[pathSoFar.length - 1];
                    navigated = true;
                    break;
                }
            }
            if (navigated) {
                done = true;
            }
        }
    }

    debugJourney('DONE max_turns_reached', { steps: steps.length });
    return { steps, goalReached: false, message: 'Max turns reached.' };
}

export type JourneyStreamEvent =
    | { type: 'step'; step: JourneyStep }
    | { type: 'done'; result: JourneyResult }
    | { type: 'error'; message: string };

/** Async generator that yields each step and finally the result (for streaming UI). */
export async function* runJourneyAgentStream(
    openai: OpenAI,
    goal: string,
    domainResult: DomainScanResultWithFullPages
): AsyncGenerator<JourneyStreamEvent, void, unknown> {
    const pageContexts = buildPageContexts(domainResult);
    const startUrl = getStartPageUrl(domainResult);
    if (!startUrl || !pageContexts.has(startUrl)) {
        yield { type: 'done', result: { steps: [], goalReached: false, message: 'No start page or empty scan.' } };
        return;
    }

    debugJourney('STREAM START', { goal, startUrl, totalPages: pageContexts.size });
    debugJourney('SYSTEM_PROMPT', JOURNEY_TOOL_SYSTEM_PROMPT);

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

    type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;
    let totalTurns = 0;
    while (totalTurns < MAX_TURNS) {
        totalTurns++;
        const currentContext = pageContexts.get(currentUrl);
        if (!currentContext) break;

        const alreadyTriedStream = Array.from(triedFromPage.get(currentUrl) ?? []);
        const alreadyTriedLineStream = alreadyTriedStream.length > 0
            ? `\nAlready tried from this page (do NOT navigate to these again – they did not contain the goal): ${alreadyTriedStream.map((u) => {
                const label = currentContext.outboundLinksWithLabels?.find((l) => l.url === u)?.text;
                const title = pageContexts.get(u)?.title;
                const desc = [label, title].filter(Boolean).join(' | ') || u;
                return `${desc} (${u})`;
            }).join('; ')}\n`
            : '';
        const userContentStream = `Goal: ${goal}\n\nCurrent page: ${currentContext.url}\nTitle: ${currentContext.title ?? '(none)'}\nPath so far: ${pathSoFar.length} pages.${alreadyTriedLineStream}\nUse search_on_page to find relevant links, then navigate_to one of them (only URLs from the result), or goal_reached/goal_not_found.`;
        let messages: Message[] = [
            { role: 'system', content: JOURNEY_TOOL_SYSTEM_PROMPT },
            { role: 'user', content: userContentStream },
        ];

        let done = false;
        while (!done) {
            let completion: OpenAI.Chat.Completions.ChatCompletion;
            try {
                completion = await openai.chat.completions.create({
                    model: OPENAI_MODEL,
                    messages,
                    tools: JOURNEY_TOOLS,
                    tool_choice: 'auto',
                });
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'LLM request failed.';
                yield { type: 'error', message: msg };
                yield { type: 'done', result: { steps, goalReached: false, message: msg } };
                return;
            }

            const msg = completion.choices[0]?.message;
            if (!msg) {
                yield { type: 'done', result: { steps, goalReached: false, message: 'No message from model.' } };
                return;
            }

            if (!msg.tool_calls?.length) {
                const rawContent = typeof msg.content === 'string' ? msg.content : '';
                const action = parseAgentResponse(rawContent);
                if (action?.action === 'goal_reached') {
                    yield { type: 'done', result: { steps, goalReached: true, message: action.reason } };
                    return;
                }
                if (action?.action === 'goal_not_found') {
                    if (pathSoFar.length > 1) {
                        const previousUrl = pathSoFar[pathSoFar.length - 2];
                        if (!triedFromPage.has(previousUrl)) triedFromPage.set(previousUrl, new Set());
                        triedFromPage.get(previousUrl)!.add(currentUrl);
                        steps.pop();
                        pathSoFar.pop();
                        const lastStep = steps[steps.length - 1];
                        if (lastStep) lastStep.backtrackFromReason = action.reason;
                        currentUrl = pathSoFar[pathSoFar.length - 1];
                        done = true;
                        continue;
                    }
                    yield { type: 'done', result: { steps, goalReached: false, message: action.reason } };
                    return;
                }
                if (action?.action === 'next') {
                    const nextNorm = normalizeUrl(action.next_page_url);
                    if (currentContext.outboundLinks.includes(nextNorm) && !triedFromPage.get(currentUrl)?.has(nextNorm)) {
                        const nextContext = pageContexts.get(nextNorm);
                        if (nextContext && steps.length < MAX_STEPS) {
                            const nextScan = pageByUrl.get(nextNorm);
                            const step: JourneyStep = {
                                pageUrl: nextScan?.url ?? nextContext.url,
                                pageTitle: nextContext.title,
                                triggerLabel: action.trigger_label,
                                index: steps.length,
                            };
                            steps.push(step);
                            pathSoFar.push(nextNorm);
                            currentUrl = nextNorm;
                            yield { type: 'step', step };
                        }
                    }
                }
                done = true;
                break;
            }

            messages = [...messages, { role: 'assistant', content: msg.content ?? null, tool_calls: msg.tool_calls }];
            let navigated = false;
            for (const tc of msg.tool_calls) {
                const fn = 'function' in tc ? tc.function : undefined;
                const name = fn?.name ?? '';
                let args: Record<string, unknown> = {};
                try {
                    args = JSON.parse(typeof fn?.arguments === 'string' ? fn.arguments : '{}') as Record<string, unknown>;
                } catch {
                    /* ignore */
                }
                const out = executeToolCall(
                    name,
                    args,
                    currentContext,
                    currentUrl,
                    pageContexts,
                    pageByUrl,
                    steps,
                    pathSoFar,
                    triedFromPage
                );
                messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(out.result) });
                if (out.returnResult) {
                    yield { type: 'done', result: out.returnResult };
                    return;
                }
                if (out.navigated) {
                    currentUrl = pathSoFar[pathSoFar.length - 1];
                    const lastStep = steps[steps.length - 1];
                    if (lastStep) yield { type: 'step', step: lastStep };
                    navigated = true;
                    break;
                }
            }
            if (navigated) done = true;
        }
    }

    debugJourney('STREAM DONE max_turns_reached', { steps: steps.length });
    yield { type: 'done', result: { steps, goalReached: false, message: 'Max turns reached.' } };
}
