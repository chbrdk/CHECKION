import { runScan } from './scanner';
import { getSitemapUrlFromRobots, fetchSitemapUrls } from './sitemap';
import type { ScanResult, DomainScanResult, EeatDomainAggregate } from './types';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_MAX_PAGES = 1000;
const MAX_DEPTH = 3; // Home + 3 levels; max pages will likely hit first
/** Upper cap for maxPages (e.g. "Alle" in UI). */
export const DOMAIN_SCAN_MAX_PAGES_CAP = 5000;

export type DomainScanOptions = {
    /** If true (default), discover sitemap and use its URLs as scan list when available; otherwise pure link crawl. */
    useSitemap?: boolean;
    /** Max number of pages to scan (default 1000). Capped at DOMAIN_SCAN_MAX_PAGES_CAP. */
    maxPages?: number;
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

/** Treat www and non-www as same domain for internal link detection */
function isSameDomain(a: string, b: string): boolean {
    try {
        const hostA = new URL(a).hostname.replace(/^www\./i, '');
        const hostB = new URL(b).hostname.replace(/^www\./i, '');
        return hostA === hostB;
    } catch {
        return false;
    }
}

/**
 * URL path depth: porsche.com = 0, porsche.com/australia = 1, porsche.com/australia/models = 2, etc.
 */
function pathDepth(url: string): number {
    try {
        const path = new URL(url).pathname.replace(/\/$/, '');
        if (!path) return 0;
        return path.split('/').filter(Boolean).length;
    } catch {
        return 0;
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
    const maxPages = Math.min(
        DOMAIN_SCAN_MAX_PAGES_CAP,
        Math.max(1, options.maxPages ?? DEFAULT_MAX_PAGES)
    );

    // Queue: { url, depth }; seed from sitemap or start URL
    let queue: Array<{ url: string, depth: number }> = [];
    const visited = new Set<string>();
    let sitemapMode = false;

    if (useSitemap) {
        const sitemapUrl = await getSitemapUrlFromRobots(origin);
        if (sitemapUrl) {
            const sitemapUrls = await fetchSitemapUrls(sitemapUrl, origin, maxPages);
            // Only use sitemap when it provides enough URLs; otherwise fall back to link crawl so we discover pages from the first scan
            if (sitemapUrls.length > 1) {
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

    while (queue.length > 0 && results.length < maxPages) {
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

            // Add to Graph (depth from URL path; title from scan)
            graphNodes.push({
                id: normalizedCurrent,
                url: current.url,
                score: result.ux?.score || result.score,
                depth: pathDepth(current.url),
                status: 'ok',
                title: result.seo?.title ?? undefined
            });

            // Extract internal links only when not in sitemap mode (in sitemap mode we only scan the sitemap URL list)
            if (!sitemapMode && current.depth < MAX_DEPTH && results.length + queue.length < maxPages * 2) {
                const newLinks = result.allLinks || [];
                console.log(`[Spider] Found ${newLinks.length} links on ${current.url}`);

                newLinks.forEach(link => {
                    const norm = normalizeUrl(link);
                    const isInternal = norm.startsWith(origin) || isSameDomain(link, origin);
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
                depth: pathDepth(current.url),
                status: 'error'
            });
            yield { type: 'error', url: current.url, message: `Scan failed: ${(e as Error).message}` };
        }
    }

    // Parent links from URL path: link each node to its path parent (e.g. /australia/models → /australia) so the graph shows a tree
    const nodeIds = new Set(graphNodes.map((n) => n.id));
    const linkKeys = new Set(graphLinks.map((l) => `${l.source}\t${l.target}`));
    graphNodes.forEach((node) => {
        if (node.depth <= 0) return;
        try {
            const u = new URL(node.url);
            const pathname = u.pathname.replace(/\/$/, '');
            const segments = pathname.split('/').filter(Boolean);
            if (segments.length === 0) return;
            const parentPath = segments.length === 1 ? '/' : '/' + segments.slice(0, -1).join('/');
            const parentUrl = parentPath === '/' ? origin : origin + parentPath;
            const parentNorm = normalizeUrl(parentUrl);
            if (parentNorm === node.id || !nodeIds.has(parentNorm)) return;
            const key = `${parentNorm}\t${node.id}`;
            if (linkKeys.has(key)) return;
            linkKeys.add(key);
            graphLinks.push({ source: parentNorm, target: node.id });
        } catch {
            // ignore invalid URLs
        }
    });

    // Link edges from page content: for each scanned page, add edge to every other scanned page it links to (allLinks)
    results.forEach(({ result }) => {
        const sourceNorm = normalizeUrl(result.url);
        if (!nodeIds.has(sourceNorm)) return;
        (result.allLinks || []).forEach((href: string) => {
            try {
                const targetNorm = normalizeUrl(href);
                if (!nodeIds.has(targetNorm) || targetNorm === sourceNorm) return;
                const key = `${sourceNorm}\t${targetNorm}`;
                if (linkKeys.has(key)) return;
                linkKeys.add(key);
                graphLinks.push({ source: sourceNorm, target: targetNorm });
            } catch {
                // skip invalid URLs
            }
        });
    });

    // E-E-A-T aggregate (from deep scan only)
    const pages = results.map((r) => r.result);
    const totalPages = pages.length;
    const eeat: EeatDomainAggregate = {
        trust: {
            pagesWithImpressum: pages.filter((p) => p.eeatSignals?.hasImpressum).length,
            pagesWithContact: pages.filter((p) => p.eeatSignals?.hasContact).length,
            pagesWithPrivacy: pages.filter((p) => p.privacy?.hasPrivacyPolicy).length,
            totalPages,
        },
        experience: {
            pagesWithAbout: pages.filter((p) => p.eeatSignals?.hasAboutLink).length,
            pagesWithTeam: pages.filter((p) => p.eeatSignals?.hasTeamLink).length,
            pagesWithCaseStudyMention: pages.filter((p) => p.eeatSignals?.hasCaseStudyMention).length,
            totalPages,
        },
        expertise: {
            pagesWithAuthorBio: pages.filter((p) => p.generative?.expertise?.hasAuthorBio).length,
            pagesWithArticleAuthor: pages.filter((p) => p.generative?.technical?.articleSchemaQuality?.hasAuthor).length,
            avgCitationsPerPage:
                totalPages > 0
                    ? pages.reduce((sum, p) => sum + (p.generative?.content?.citationDensity ?? 0), 0) / totalPages
                    : 0,
            totalPages,
        },
        authoritativeness: undefined,
    };

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
        systemicIssues,
        eeat
    };

    yield { type: 'complete', domainResult: finalResult };
    return finalResult;
}
