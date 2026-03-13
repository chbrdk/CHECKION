/**
 * SERP API client for rank tracking. Supports Serper and ScrapingRobot.
 * Uses SERP_API_KEY and SERP_API_PROVIDER from env; key is never exposed to client.
 * Serper: fetches up to numPages (default 10), gl/hl always set (main markets).
 * We still determine at which position (1–100) the domain appears in the combined organic results.
 */

import { API_SERP_BASE, API_SCRAPINGROBOT_BASE } from './external-apis';
import { SERP_DEFAULT_COUNTRY, SERP_DEFAULT_LANGUAGE, SERP_NUM_PAGES } from './serp-markets';

export type SerpApiProvider = 'serper' | 'scrapingrobot';

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
 * Returns the list of organic result URLs from the raw API response (provider-agnostic).
 */
function getOrganicUrls(data: unknown, provider: SerpApiProvider): string[] {
    if (provider === 'scrapingrobot') {
        const r = data as { result?: { organicResults?: Array<{ url?: string }> } };
        const list = r?.result?.organicResults ?? [];
        return list.map((item) => item?.url ?? '').filter(Boolean);
    }
    const serper = data as { organic?: Array<{ link?: string }> };
    const list = serper?.organic ?? [];
    return list.map((item) => item?.link ?? '').filter(Boolean);
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
): Promise<{ position: number | null; competitorPositions: Record<string, number | null> }> {
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
        const urls = getOrganicUrls(data, 'scrapingrobot');
        return computePositionsFromUrls(urls, domain, competitorDomains);
    }

    // Serper (default): up to numPages (default 10), gl/hl always set
    const gl = (options?.country ?? SERP_DEFAULT_COUNTRY).toLowerCase().trim();
    const hl = (options?.language ?? SERP_DEFAULT_LANGUAGE).toLowerCase().trim();
    const numPages = Math.min(100, Math.max(1, options?.numPages ?? SERP_NUM_PAGES));
    const allUrls: string[] = [];

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
        const pageUrls = getOrganicUrls(data, 'serper');
        allUrls.push(...pageUrls);
        if (pageUrls.length === 0) break; // no more results
    }

    return computePositionsFromUrls(allUrls, domain, competitorDomains);
}
