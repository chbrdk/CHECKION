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
    pageIndex?: ScanResult['pageIndex'];
}

export interface DomainSummaryResponse extends Omit<DomainScanResult, 'pages'> {
    pages: SlimPage[];
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

function toSlimPage(p: ScanResult): SlimPage {
    return {
        id: p.id,
        url: p.url,
        score: p.score,
        stats: p.stats ?? { errors: 0, warnings: 0, notices: 0 },
        ux: p.ux != null ? { score: p.ux.score } : undefined,
        pageIndex: p.pageIndex,
    };
}

export function buildDomainSummary(scan: DomainScanResult): DomainSummaryResponse {
    const pages = scan.pages ?? [];
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
    const slimPages: SlimPage[] = pages.map(toSlimPage);
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
        aggregated,
    };
}
