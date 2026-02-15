/**
 * Sitemap discovery and URL extraction for deep (domain) scan.
 * Discovers sitemap via robots.txt or well-known URLs; parses XML to collect URLs (same origin, limited).
 */

const FETCH_TIMEOUT_MS = 8000;
const MAX_SITEMAP_INDEX_CHILDREN = 5;

/**
 * Fetch with timeout (Node/Next.js).
 */
async function fetchWithTimeout(url: string): Promise<Response> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            signal: ctrl.signal,
            headers: { Accept: 'application/xml, text/xml, */*' },
        });
        return res;
    } finally {
        clearTimeout(t);
    }
}

/**
 * Get first Sitemap URL from robots.txt for the given origin.
 * Fallback: try {origin}/sitemap.xml and {origin}/sitemap_index.xml.
 */
export async function getSitemapUrlFromRobots(origin: string): Promise<string | null> {
    try {
        const robotsRes = await fetchWithTimeout(`${origin}/robots.txt`);
        if (!robotsRes.ok) return tryWellKnownSitemaps(origin);
        const text = await robotsRes.text();
        const match = text.match(/^\s*Sitemap:\s*(https?:\/\/[^\s#]+)/im);
        if (match && match[1]) return match[1].trim();
        return await tryWellKnownSitemaps(origin);
    } catch {
        return await tryWellKnownSitemaps(origin);
    }
}

async function tryWellKnownSitemaps(origin: string): Promise<string | null> {
    for (const path of ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml']) {
        try {
            const res = await fetchWithTimeout(origin + path);
            if (res.ok) return origin + path;
        } catch {
            // continue
        }
    }
    return null;
}

/**
 * Extract all <loc>...</loc> URLs from sitemap XML text.
 * Works for both <urlset> and <sitemapindex> (same tag name).
 */
function extractLocUrls(xml: string): string[] {
    const urls: string[] = [];
    const re = /<loc>\s*([^<]+)\s*<\/loc>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
        urls.push(m[1].trim());
    }
    return urls;
}

/**
 * Check if XML looks like a sitemap index (contains <sitemap>).
 */
function isSitemapIndex(xml: string): boolean {
    return /<sitemap\s/i.test(xml) || /<\/sitemap>/i.test(xml);
}

/**
 * Fetch a sitemap URL and return its XML text.
 */
async function fetchSitemapXml(url: string): Promise<string | null> {
    try {
        const res = await fetchWithTimeout(url);
        if (!res.ok) return null;
        return await res.text();
    } catch {
        return null;
    }
}

/**
 * Fetch sitemap at sitemapUrl and collect up to maxUrls URLs from same origin.
 * If sitemap is an index, follow up to MAX_SITEMAP_INDEX_CHILDREN child sitemaps.
 */
export async function fetchSitemapUrls(
    sitemapUrl: string,
    origin: string,
    maxUrls: number
): Promise<string[]> {
    const collected: string[] = [];
    const seen = new Set<string>();

    function normalize(u: string): string {
        try {
            const url = new URL(u);
            return url.origin + url.pathname.replace(/\/$/, '') || url.origin + '/';
        } catch {
            return u;
        }
    }

    function sameOrigin(url: string): boolean {
        try {
            return new URL(url).origin === origin;
        } catch {
            return false;
        }
    }

    async function addFromXml(xml: string): Promise<boolean> {
        const locs = extractLocUrls(xml);
        for (const loc of locs) {
            if (collected.length >= maxUrls) return true;
            if (!sameOrigin(loc)) continue;
            const n = normalize(loc);
            if (seen.has(n)) continue;
            seen.add(n);
            collected.push(loc);
        }
        return collected.length >= maxUrls;
    }

    const firstXml = await fetchSitemapXml(sitemapUrl);
    if (!firstXml) return [];

    if (isSitemapIndex(firstXml)) {
        const childSitemaps = extractLocUrls(firstXml).filter(sameOrigin);
        let followed = 0;
        for (const childUrl of childSitemaps) {
            if (followed >= MAX_SITEMAP_INDEX_CHILDREN || collected.length >= maxUrls) break;
            const childXml = await fetchSitemapXml(childUrl);
            if (childXml) {
                await addFromXml(childXml);
                followed++;
            }
        }
    } else {
        await addFromXml(firstXml);
    }

    return collected;
}
