/**
 * SERP API client for rank tracking. Supports Serper and ScrapingRobot.
 * Uses SERP_API_KEY and SERP_API_PROVIDER from env; key is never exposed to client.
 * Serper: fetches up to numPages (default 10), gl/hl always set (main markets).
 * We still determine at which position (1–100) the domain appears in the combined organic results.
 */

import { API_SERP_BASE, API_SCRAPINGROBOT_BASE } from './external-apis';
import {
    parseScrapingRobotOrganic,
    parseSerperOrganicPage,
    type SerpOrganicResult,
} from './serp-organic';
import { SERP_DEFAULT_COUNTRY, SERP_DEFAULT_LANGUAGE, SERP_NUM_PAGES } from './serp-markets';

export type { SerpOrganicResult } from './serp-organic';

export type SerpApiProvider = 'serper' | 'scrapingrobot';

/** First organic SERP result (position 1) for display and competitive context. */
export interface SerpLeader {
    domain: string;
    url: string;
}

export interface FetchSerpPositionResult {
    position: number | null;
    competitorPositions: Record<string, number | null>;
    /** Who holds organic position 1 in the fetched SERP (always captured when results exist). */
    serpLeader: SerpLeader | null;
    /** Full organic listings (titles, snippets, URLs) for Google-style SERP preview. */
    organicResults: SerpOrganicResult[];
}

export interface FetchSerpPositionOptions {
    /** Country for results (gl), e.g. de, us. Always sent for Serper. */
    country?: string;
    /** Interface language (hl), e.g. de, en. Always sent for Serper. */
    language?: string;
    device?: string;
    /** Number of result pages to fetch (Serper only). Default 10 → position 1–100. */
    numPages?: number;
    /** Optional competitor domains; positions returned in competitorPositions (same SERP, no extra calls). */
    competitorDomains?: string[];
}

/**
 * Normalizes a domain for comparison (strip protocol, www, trailing slash, lowercase).
 */
function normalizeDomain(domain: string): string {
    let d = domain.trim().toLowerCase();
    d = d.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    return d;
}

function domainFromUrl(url: string): string | null {
    try {
        const u = new URL(url.startsWith('http') ? url : `https://${url}`);
        return u.hostname.toLowerCase().replace(/^www\./, '');
    } catch {
        return null;
    }
}

/**
 * Returns the first organic result (position 1) from the combined URL list.
 */
function getSerpLeaderFromUrls(allUrls: string[]): SerpLeader | null {
    const firstUrl = allUrls[0];
    if (!firstUrl) return null;
    const domain = domainFromUrl(firstUrl);
    if (!domain) return null;
    return { domain, url: firstUrl };
}

/**
 * Checks if a URL's host contains the given domain (e.g. "example.com" matches "https://www.example.com/page").
 */
function urlMatchesDomain(url: string, domain: string): boolean {
    try {
        const u = new URL(url.startsWith('http') ? url : `https://${url}`);
        const host = u.hostname.toLowerCase().replace(/^www\./, '');
        const normDomain = normalizeDomain(domain);
        return host === normDomain || host.endsWith('.' + normDomain);
    } catch {
        return false;
    }
}

/**
 * Given combined organic URLs and a list of domains (our + competitors), returns position for our domain and competitorPositions map (normalized domain -> 1-based position or null).
 */
function computePositionsFromUrls(
    allUrls: string[],
    ourDomain: string,
    competitorDomains: string[]
): { position: number | null; competitorPositions: Record<string, number | null> } {
    const normOur = normalizeDomain(ourDomain);
    let position: number | null = null;
    for (let i = 0; i < allUrls.length; i++) {
        if (urlMatchesDomain(allUrls[i], normOur)) {
            position = i + 1;
            break;
        }
    }
    const competitorPositions: Record<string, number | null> = {};
    for (const d of competitorDomains) {
        const norm = normalizeDomain(d);
        if (norm === normOur) continue;
        let pos: number | null = null;
        for (let i = 0; i < allUrls.length; i++) {
            if (urlMatchesDomain(allUrls[i], norm)) {
                pos = i + 1;
                break;
            }
        }
        competitorPositions[norm] = pos;
    }
    return { position, competitorPositions };
}

/**
 * Fetches Google SERP for the keyword and returns the 1-based position of the first result
 * whose URL matches the given domain, or null if not found. Optionally returns positions for competitor domains (same SERP).
 * Supports Serper (default) and ScrapingRobot via SERP_API_PROVIDER.
 */
export async function fetchSerpPosition(
    keyword: string,
    domain: string,
    options?: FetchSerpPositionOptions
): Promise<FetchSerpPositionResult> {
    const apiKey = process.env.SERP_API_KEY;
    if (!apiKey) {
        throw new Error('SERP_API_KEY is not configured');
    }
    const provider = (process.env.SERP_API_PROVIDER ?? 'serper').toLowerCase() as SerpApiProvider;
    const competitorDomains = options?.competitorDomains ?? [];

    if (provider === 'scrapingrobot') {
        const searchUrl = new URL('https://www.google.com/search');
        searchUrl.searchParams.set('q', keyword);
        if (options?.country) searchUrl.searchParams.set('gl', options.country);
        const apiUrl = `${API_SCRAPINGROBOT_BASE}?token=${encodeURIComponent(apiKey)}`;
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: searchUrl.toString(),
                module: 'GoogleScraper',
            }),
            signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`SERP API error (ScrapingRobot): ${res.status} ${text.slice(0, 200)}`);
        }
        const data = (await res.json()) as unknown;
        const organicResults = parseScrapingRobotOrganic(data);
        const urls = organicResults.map((o) => o.link);
        const { position, competitorPositions } = computePositionsFromUrls(urls, domain, competitorDomains);
        return { position, competitorPositions, serpLeader: getSerpLeaderFromUrls(urls), organicResults };
    }

    // Serper (default): up to numPages (default 10), gl/hl always set
    const gl = (options?.country ?? SERP_DEFAULT_COUNTRY).toLowerCase().trim();
    const hl = (options?.language ?? SERP_DEFAULT_LANGUAGE).toLowerCase().trim();
    const numPages = Math.min(100, Math.max(1, options?.numPages ?? SERP_NUM_PAGES));
    const allUrls: string[] = [];
    const organicResults: SerpOrganicResult[] = [];

    for (let page = 1; page <= numPages; page++) {
        const url = `${API_SERP_BASE}/search`;
        const body: Record<string, unknown> = {
            q: keyword,
            gl,
            hl,
            page,
        };
        if (options?.device) body.type = options.device === 'mobile' ? 'search' : 'search';

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(20000),
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`SERP API error: ${res.status} ${text.slice(0, 200)}`);
        }

        const data = (await res.json()) as unknown;
        const pageOrganic = parseSerperOrganicPage(data, allUrls.length + 1);
        const pageUrls = pageOrganic.map((o) => o.link);
        organicResults.push(...pageOrganic);
        allUrls.push(...pageUrls);
        if (pageUrls.length === 0) break; // no more results
    }

    const { position, competitorPositions } = computePositionsFromUrls(allUrls, domain, competitorDomains);
    return {
        position,
        competitorPositions,
        serpLeader: getSerpLeaderFromUrls(allUrls),
        organicResults,
    };
}
