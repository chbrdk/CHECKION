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
        generative: ReturnType<typeof aggregateGenerative>;
        structure: ReturnType<typeof aggregateStructure>;
        performance: ReturnType<typeof aggregatePerformance>;
        eco: ReturnType<typeof aggregateEco>;
    };
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
    };
}

/** Build summary from stored payload (return as-is) or from legacy full pages. */
export function buildDomainSummary(scan: DomainScanResult): DomainSummaryResponse {
    if (hasStoredAggregated(scan) && !isFullPages(scan.pages)) {
        return {
            ...scan,
            pages: scan.pages as SlimPage[],
            totalPageCount: (scan.pages as SlimPage[]).length,
            aggregated: scan.aggregated as DomainSummaryResponse['aggregated'],
        };
    }
    const pages = (scan.pages ?? []) as ScanResult[];
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
        totalPageCount: pages.length,
        aggregated,
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
