/**
 * SERP organic result items for Google-style preview UI.
 */

export interface SerpOrganicResult {
    /** 1-based position in the combined SERP (across fetched pages). */
    position: number;
    title: string;
    link: string;
    snippet: string;
    domain: string;
}

function domainFromUrl(url: string): string {
    try {
        const u = new URL(url.startsWith('http') ? url : `https://${url}`);
        return u.hostname.toLowerCase().replace(/^www\./, '');
    } catch {
        return '';
    }
}

type SerperOrganicItem = { title?: string; link?: string; snippet?: string };
type ScrapingRobotOrganicItem = { title?: string; url?: string; snippet?: string; description?: string };

export function parseSerperOrganicPage(
    data: unknown,
    startPosition: number
): SerpOrganicResult[] {
    const serper = data as { organic?: SerperOrganicItem[] };
    const list = serper?.organic ?? [];
    const results: SerpOrganicResult[] = [];
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const link = item?.link?.trim() ?? '';
        if (!link) continue;
        results.push({
            position: startPosition + i,
            title: item?.title?.trim() || link,
            link,
            snippet: item?.snippet?.trim() ?? '',
            domain: domainFromUrl(link),
        });
    }
    return results;
}

export function parseScrapingRobotOrganic(data: unknown): SerpOrganicResult[] {
    const r = data as { result?: { organicResults?: ScrapingRobotOrganicItem[] } };
    const list = r?.result?.organicResults ?? [];
    const results: SerpOrganicResult[] = [];
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const link = item?.url?.trim() ?? '';
        if (!link) continue;
        results.push({
            position: i + 1,
            title: item?.title?.trim() || link,
            link,
            snippet: (item?.snippet ?? item?.description ?? '').trim(),
            domain: domainFromUrl(link),
        });
    }
    return results;
}

export function normalizeRankDomainForMatch(domain: string): string {
    return domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
}

export function domainMatchesOrganic(domain: string, organicDomain: string): boolean {
    const norm = normalizeRankDomainForMatch(domain);
    const o = normalizeRankDomainForMatch(organicDomain);
    if (!norm || !o) return false;
    return o === norm || o.endsWith('.' + norm) || norm.endsWith('.' + o);
}
