/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/domain/[id]/summary (optimized for large scans) */
/* Returns pre-aggregated data + slim page list. No full ScanResult[] over the wire. */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDomainScan } from '@/lib/db/scans';
import {
    aggregateIssues,
    aggregateUx,
    aggregateSeo,
    aggregateLinks,
    aggregateInfra,
    aggregateGenerative,
    aggregateStructure,
} from '@/lib/domain-aggregation';
import type { ScanResult, DomainScanResult } from '@/lib/types';

/** Slim page for list/links; includes pageIndex for Journey flowchart. */
export interface SlimPage {
    id: string;
    url: string;
    score: number;
    stats: { errors: number; warnings: number; notices: number };
    ux?: { score: number };
    pageIndex?: ScanResult['pageIndex'];
}

export type DomainSummaryResponse = Omit<DomainScanResult, 'pages'> & {
    pages: SlimPage[];
    aggregated: {
        issues: ReturnType<typeof aggregateIssues>;
        ux: ReturnType<typeof aggregateUx>;
        seo: ReturnType<typeof aggregateSeo>;
        links: ReturnType<typeof aggregateLinks>;
        infra: ReturnType<typeof aggregateInfra>;
        generative: ReturnType<typeof aggregateGenerative>;
        structure: ReturnType<typeof aggregateStructure>;
    };
};

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

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const scan = await getDomainScan(id, session.user.id);
    if (!scan) {
        return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    const pages = scan.pages ?? [];
    const aggregated = {
        issues: aggregateIssues(pages),
        ux: aggregateUx(pages),
        seo: aggregateSeo(pages),
        links: aggregateLinks(pages),
        infra: aggregateInfra(pages),
        generative: aggregateGenerative(pages),
        structure: aggregateStructure(pages),
    };

    const slimPages: SlimPage[] = pages.map(toSlimPage);

    const summary: DomainSummaryResponse = {
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

    return NextResponse.json(summary);
}
