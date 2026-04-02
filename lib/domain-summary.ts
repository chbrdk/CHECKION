/**
 * Domain summary: built from stored payload (new format) or from full pages (legacy).
 * New format: domain_scans.payload already has pages: SlimPage[] and aggregated (computed during deep scan).
 */
import {
    aggregateIssues,
    aggregateUx,
    aggregateSeo,
    aggregateLinks,
    aggregateInfra,
    aggregateEeatOnPage,
    aggregateGenerative,
    aggregateStructure,
    aggregatePerformance,
    aggregateEco,
} from './domain-aggregation';
import type { ScanResult, DomainScanResult, SlimPage } from './types';

export type { SlimPage } from './types';

export interface DomainSummaryResponse extends Omit<DomainScanResult, 'pages'> {
    pages: SlimPage[];
    totalPageCount?: number;
    aggregated: {
        issues: ReturnType<typeof aggregateIssues>;
        ux: ReturnType<typeof aggregateUx>;
        seo: ReturnType<typeof aggregateSeo>;
        links: ReturnType<typeof aggregateLinks>;
        infra: ReturnType<typeof aggregateInfra>;
        eeatOnPage?: ReturnType<typeof aggregateEeatOnPage>;
        generative: ReturnType<typeof aggregateGenerative>;
        structure: ReturnType<typeof aggregateStructure>;
        performance: ReturnType<typeof aggregatePerformance>;
        eco: ReturnType<typeof aggregateEco>;
    };
}

/** Optional fields returned only by GET /api/scan/domain/[id]/summary (not stored in DB). */
export interface DomainSummaryApiMeta {
    /** True when `?light=1` omitted per-page SEO rows (`aggregated.seo.pages`) to shrink the JSON. */
    seoPageRowsOmitted?: boolean;
}

export interface DomainSummaryApiResponse extends DomainSummaryResponse {
    summaryMeta?: DomainSummaryApiMeta;
}

/** True if payload has precomputed aggregated (new format). */
export function hasStoredAggregated(scan: DomainScanResult): scan is DomainScanResult & { aggregated: NonNullable<DomainScanResult['aggregated']> } {
    return scan.aggregated != null && typeof scan.aggregated === 'object';
}

/** True if pages are full ScanResult[] (legacy). */
function isFullPages(pages: DomainScanResult['pages']): pages is ScanResult[] {
    if (!pages?.length) return false;
    const first = pages[0] as Record<string, unknown>;
    return Array.isArray(first.issues) || first.pageIndex != null;
}

function toSlimPage(p: ScanResult): SlimPage {
    return {
        id: p.id,
        url: p.url,
        score: p.score,
        stats: p.stats ?? { errors: 0, warnings: 0, notices: 0 },
        ux: p.ux != null ? { score: p.ux.score } : undefined,
        eeatSignals: p.eeatSignals ?? undefined,
        hasPrivacy: p.privacy?.hasPrivacyPolicy ?? false,
        pageClassification: p.pageClassification ?? undefined,
    };
}

/** Build summary from stored payload (return as-is) or from legacy full pages. */
export function buildDomainSummary(scan: DomainScanResult): DomainSummaryResponse {
    if (hasStoredAggregated(scan) && !isFullPages(scan.pages)) {
        const pagesArr = (scan.pages as SlimPage[]) ?? [];
        const pageCount = pagesArr.length > 0 ? pagesArr.length : (scan.totalPages ?? 0);
        return {
            ...scan,
            pages: pagesArr,
            totalPageCount: pageCount,
            aggregated: scan.aggregated as DomainSummaryResponse['aggregated'],
        };
    }
    const pages = (scan.pages ?? []) as ScanResult[];
    const pageCount = pages.length > 0 ? pages.length : (scan.totalPages ?? 0);
    const aggregated = {
        issues: aggregateIssues(pages),
        ux: aggregateUx(pages),
        seo: aggregateSeo(pages),
        links: aggregateLinks(pages),
        infra: aggregateInfra(pages),
        eeatOnPage: aggregateEeatOnPage(pages),
        generative: aggregateGenerative(pages),
        structure: aggregateStructure(pages),
        performance: aggregatePerformance(pages),
        eco: aggregateEco(pages),
    };
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
        pages: pages.map(toSlimPage),
        totalPageCount: pageCount,
        aggregated,
    };
}

/**
 * Shrink API JSON: drop `aggregated.seo.pages` (often one row per scanned URL — largest array in summary).
 * Counts and other `aggregated.seo` fields stay intact for chips and copy.
 */
export function toLightDomainSummaryApiPayload(summary: DomainSummaryResponse): DomainSummaryApiResponse {
    if (!summary.aggregated?.seo) {
        return { ...summary, summaryMeta: { seoPageRowsOmitted: true } };
    }
    return {
        ...summary,
        aggregated: {
            ...summary.aggregated,
            seo: {
                ...summary.aggregated.seo,
                pages: [],
            },
        },
        summaryMeta: { seoPageRowsOmitted: true },
    };
}

/** Build the payload to store in domain_scans after deep scan (slim pages + precomputed aggregated). */
export function buildStoredDomainPayload(
    fullPages: ScanResult[],
    base: Pick<DomainScanResult, 'id' | 'domain' | 'timestamp' | 'status' | 'progress' | 'totalPages' | 'score' | 'graph' | 'systemicIssues' | 'eeat'>
): DomainScanResult {
    const aggregated = {
        issues: aggregateIssues(fullPages),
        ux: aggregateUx(fullPages),
        seo: aggregateSeo(fullPages),
        links: aggregateLinks(fullPages),
        infra: aggregateInfra(fullPages),
        eeatOnPage: aggregateEeatOnPage(fullPages),
        generative: aggregateGenerative(fullPages),
        structure: aggregateStructure(fullPages),
        performance: aggregatePerformance(fullPages),
        eco: aggregateEco(fullPages),
    };
    return {
        ...base,
        pages: fullPages.map(toSlimPage),
        aggregated,
    };
}
