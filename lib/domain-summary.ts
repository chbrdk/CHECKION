/**
 * Build domain summary (aggregated + slim pages) from a DomainScanResult.
 * Used by GET /api/scan/domain/[id]/summary and by public share payload.
 */
import {
    aggregateIssues,
    aggregateUx,
    aggregateSeo,
    aggregateLinks,
    aggregateInfra,
    aggregateGenerative,
    aggregateStructure,
    aggregatePerformance,
    aggregateEco,
} from './domain-aggregation';
import type { ScanResult, DomainScanResult } from './types';

export interface SlimPage {
    id: string;
    url: string;
    score: number;
    stats: { errors: number; warnings: number; notices: number };
    ux?: { score: number };
    /** Omitted in list responses to keep payload small; fetch per page when needed. */
    pageIndex?: ScanResult['pageIndex'];
}

export interface DomainSummaryResponse extends Omit<DomainScanResult, 'pages'> {
    pages: SlimPage[];
    /** Total number of scanned pages (pages array may be truncated; use /pages endpoint for more). */
    totalPageCount?: number;
    aggregated: {
        issues: ReturnType<typeof aggregateIssues>;
        ux: ReturnType<typeof aggregateUx>;
        seo: ReturnType<typeof aggregateSeo>;
        links: ReturnType<typeof aggregateLinks>;
        infra: ReturnType<typeof aggregateInfra>;
        generative: ReturnType<typeof aggregateGenerative>;
        structure: ReturnType<typeof aggregateStructure>;
        performance: ReturnType<typeof aggregatePerformance>;
        eco: ReturnType<typeof aggregateEco>;
    };
}

/** Build slim page without pageIndex to keep list payload small. */
function toSlimPage(p: ScanResult, includePageIndex = false): SlimPage {
    const slim: SlimPage = {
        id: p.id,
        url: p.url,
        score: p.score,
        stats: p.stats ?? { errors: 0, warnings: 0, notices: 0 },
        ux: p.ux != null ? { score: p.ux.score } : undefined,
    };
    if (includePageIndex && p.pageIndex) slim.pageIndex = p.pageIndex;
    return slim;
}

export function buildDomainSummary(
    scan: DomainScanResult,
    options?: { pagesLimit?: number; includePageIndex?: boolean }
): DomainSummaryResponse {
    const pages = scan.pages ?? [];
    const includePageIndex = options?.includePageIndex ?? false;
    const pagesLimit = options?.pagesLimit;
    const aggregated = {
        issues: aggregateIssues(pages),
        ux: aggregateUx(pages),
        seo: aggregateSeo(pages),
        links: aggregateLinks(pages),
        infra: aggregateInfra(pages),
        generative: aggregateGenerative(pages),
        structure: aggregateStructure(pages),
        performance: aggregatePerformance(pages),
        eco: aggregateEco(pages),
    };
    const allSlim: SlimPage[] = pages.map((p) => toSlimPage(p, includePageIndex));
    const slimPages = pagesLimit != null ? allSlim.slice(0, pagesLimit) : allSlim;
    return {
        id: scan.id,
        domain: scan.domain,
        timestamp: scan.timestamp,
        status: scan.status,
        progress: scan.progress,
        totalPages: scan.totalPages,
        score: scan.score,
        graph: scan.graph,
        systemicIssues: scan.systemicIssues,
        eeat: scan.eeat,
        error: scan.error,
        llmSummary: scan.llmSummary,
        pages: slimPages,
        totalPageCount: pages.length,
        aggregated,
    };
}

/** Return slim pages slice (for paginated "load more"). No pageIndex. */
export function getSlimPagesSlice(
    scan: DomainScanResult,
    offset: number,
    limit: number
): SlimPage[] {
    const pages = scan.pages ?? [];
    return pages.slice(offset, offset + limit).map((p) => toSlimPage(p, false));
}
