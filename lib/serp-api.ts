/**
 * SERP API client for rank tracking. Supports Serper and ScrapingRobot.
 * Uses SERP_API_KEY and SERP_API_PROVIDER from env; key is never exposed to client.
 */

import { API_SERP_BASE, API_SCRAPINGROBOT_BASE } from './external-apis';

export type SerpApiProvider = 'serper' | 'scrapingrobot';

export interface FetchSerpPositionOptions {
    country?: string;
    device?: string;
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
 * Fetches Google SERP for the keyword and returns the 1-based position of the first result
 * whose URL matches the given domain, or null if not found in organic results.
 * Supports Serper (default) and ScrapingRobot via SERP_API_PROVIDER.
 */
export async function fetchSerpPosition(
    keyword: string,
    domain: string,
    options?: FetchSerpPositionOptions
): Promise<{ position: number | null }> {
    const apiKey = process.env.SERP_API_KEY;
    if (!apiKey) {
        throw new Error('SERP_API_KEY is not configured');
    }
    const provider = (process.env.SERP_API_PROVIDER ?? 'serper').toLowerCase() as SerpApiProvider;
    const normDomain = normalizeDomain(domain);

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
        for (let i = 0; i < urls.length; i++) {
            if (urlMatchesDomain(urls[i], normDomain)) return { position: i + 1 };
        }
        return { position: null };
    }

    // Serper (default)
    const url = `${API_SERP_BASE}/search`;
    const body: Record<string, unknown> = { q: keyword };
    if (options?.country) body.gl = options.country;
    if (options?.device) body.type = options.device === 'mobile' ? 'search' : 'search';

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`SERP API error: ${res.status} ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as unknown;
    const urls = getOrganicUrls(data, 'serper');
    for (let i = 0; i < urls.length; i++) {
        if (urlMatchesDomain(urls[i], normDomain)) return { position: i + 1 };
    }
    return { position: null };
}
