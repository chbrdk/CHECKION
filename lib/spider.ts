import { runScan } from './scanner';
import { getSitemapUrlFromRobots, fetchSitemapUrls } from './sitemap';
import type { ScanResult, DomainScanResult } from './types';
import { v4 as uuidv4 } from 'uuid';

const MAX_PAGES = 100;
const MAX_DEPTH = 3; // Home + 3 levels; max pages will likely hit first

export type DomainScanOptions = {
    /** If true (default), discover sitemap and use its URLs as scan list when available; otherwise pure link crawl. */
    useSitemap?: boolean;
};


/**
 * Normalizes a URL to ensure consistent deduplication
 */
function normalizeUrl(url: string): string {
    try {
        const u = new URL(url);
        // Remove trailing slash, fragments, and queries for cleaner spidering
        return u.origin + u.pathname.replace(/\/$/, '');
    } catch (e) {
        return url;
    }
}

/**
 * Calculates the Domain Health Score
 * Formula: Weighted Average based on depth.
 * Depth 0 (Home) = 1.5x weight
 * Depth 1+ = 1.0x weight
 */
function calculateDomainScore(pages: Array<{ result: ScanResult, depth: number }>): number {
    if (pages.length === 0) return 0;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    pages.forEach(p => {
        const weight = p.depth === 0 ? 1.5 : 1.0;
        totalWeightedScore += (p.result.ux?.score || p.result.score) * weight;
        totalWeight += weight;
    });

    return Math.round(totalWeightedScore / totalWeight);
}

/**
 * Identifies Systemic Issues (same issue ID appearing on >50% of pages)
 */
function identifySystemicIssues(pages: Array<ScanResult>) {
    const issueMap = new Map<string, { title: string, count: number, urls: string[] }>();
    const totalPages = pages.length;

    pages.forEach(page => {
        // Use a set to avoid counting the same issue multiple times per page
        const pageIssues = new Set<string>();

        page.issues.forEach(issue => {
            const key = issue.code; // Unique rule ID (e.g. "color-contrast")
            if (!pageIssues.has(key)) {
                pageIssues.add(key);

                if (!issueMap.has(key)) {
                    issueMap.set(key, { title: issue.message, count: 0, urls: [] });
                }
                const entry = issueMap.get(key)!;
                entry.count++;
                entry.urls.push(page.url);
            }
        });
    });

    // Filter for systemic (present on > 50% of pages, if pages > 1)
    const systemic: DomainScanResult['systemicIssues'] = [];
    issueMap.forEach((val, key) => {
        if (totalPages > 1 && val.count >= Math.ceil(totalPages / 2)) {
            systemic.push({
                issueId: key,
                title: val.title,
                count: val.count,
                pages: val.urls
            });
        }
    });

    return systemic.sort((a, b) => b.count - a.count);
}

/**
 * Main Spider Function (Generator to allow streaming)
 * When useSitemap is true (default), discovers sitemap and uses its URLs as scan list if available; otherwise crawls by following links.
 */
export async function* runDomainScan(startUrl: string, options: DomainScanOptions = {}): AsyncGenerator<any, DomainScanResult, unknown> {
    const domainId = uuidv4();
    const baseUrl = new URL(startUrl);
    const origin = baseUrl.origin;
    const useSitemap = options.useSitemap !== false;

    // Queue: { url, depth }; seed from sitemap or start URL
    let queue: Array<{ url: string, depth: number }> = [];
    const visited = new Set<string>();
    let sitemapMode = false;

    if (useSitemap) {
        const sitemapUrl = await getSitemapUrlFromRobots(origin);
        if (sitemapUrl) {
            const sitemapUrls = await fetchSitemapUrls(sitemapUrl, origin, MAX_PAGES);
            if (sitemapUrls.length > 0) {
                const startNorm = normalizeUrl(startUrl);
                sitemapUrls.forEach(u => {
                    const n = normalizeUrl(u);
                    if (!visited.has(n)) {
                        visited.add(n);
                        queue.push({ url: u, depth: 0 });
                    }
                });
                if (!visited.has(startNorm)) {
                    visited.add(startNorm);
                    queue.unshift({ url: startUrl, depth: 0 });
                }
                sitemapMode = true;
            }
        }
    }

    if (queue.length === 0) {
        queue = [{ url: startUrl, depth: 0 }];
        visited.add(normalizeUrl(startUrl));
    }

    const results: Array<{ result: ScanResult, depth: number }> = [];
    const graphNodes: DomainScanResult['graph']['nodes'] = [];
    const graphLinks: DomainScanResult['graph']['links'] = [];

    yield {
        type: 'init',
        message: sitemapMode
            ? `Starting scan for ${origin} (${queue.length} URLs from sitemap)`
            : `Starting scan for ${origin}`
    };

    while (queue.length > 0 && results.length < MAX_PAGES) {
        const current = queue.shift()!;
        const normalizedCurrent = normalizeUrl(current.url);

        // Notify progress
        yield {
            type: 'progress',
            url: current.url,
            depth: current.depth,
            scannedCount: results.length + 1,
            message: `Scanning ${current.url}...`
        };

        try {
            // Run Single Page Scan
            // Note: We run a "standard" scan but could optimize options for speed
            const result = await runScan({
                url: current.url,
                device: 'desktop',
                standard: 'WCAG2AA'
            }); // Force desktop/WCAG2AA for uniformity

            // Add to results
            results.push({ result, depth: current.depth });

            // Add to Graph
            graphNodes.push({
                id: normalizedCurrent,
                url: current.url,
                score: result.ux?.score || result.score,
                depth: current.depth,
                status: 'ok'
            });

            // Extract internal links only when not in sitemap mode (in sitemap mode we only scan the sitemap URL list)
            if (!sitemapMode && current.depth < MAX_DEPTH && results.length + queue.length < MAX_PAGES * 2) {
                const newLinks = result.allLinks || [];
                console.log(`[Spider] Found ${newLinks.length} links on ${current.url}`);

                newLinks.forEach(link => {
                    const norm = normalizeUrl(link);
                    const isInternal = norm.startsWith(origin);
                    const isVisited = visited.has(norm);

                    if (isInternal && !isVisited) {
                        console.log(`[Spider] Queuing: ${norm}`);
                        visited.add(norm);
                        queue.push({ url: link, depth: current.depth + 1 });
                        graphLinks.push({ source: normalizedCurrent, target: norm });
                    }
                });
            } else if (!sitemapMode) {
                console.log(`[Spider] Max depth/pages reached. Depth: ${current.depth}, Results: ${results.length}, Queue: ${queue.length}`);
            }

        } catch (e) {
            console.error(`Failed to scan ${current.url}`, e);
            graphNodes.push({
                id: normalizedCurrent,
                url: current.url,
                score: 0,
                depth: current.depth,
                status: 'error'
            });
            yield { type: 'error', url: current.url, message: `Scan failed: ${(e as Error).message}` };
        }
    }

    // Final calculations
    const domainScore = calculateDomainScore(results);
    const systemicIssues = identifySystemicIssues(results.map(r => r.result));

    const finalResult: DomainScanResult = {
        id: domainId,
        domain: origin,
        timestamp: new Date().toISOString(),
        status: 'complete',
        progress: {
            scanned: results.length,
            total: results.length
        },
        totalPages: results.length,
        score: domainScore,
        pages: results.map(r => r.result),
        graph: {
            nodes: graphNodes,
            links: graphLinks
        },
        systemicIssues
    };

    yield { type: 'complete', domainResult: finalResult };
    return finalResult;
}
