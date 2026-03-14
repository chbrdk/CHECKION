/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/projects/[id]/domain-summary                  */
/*  Returns latest domain (deep) scan summary: score, pages, performance, eco. */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getProject } from '@/lib/db/projects';
import { listDomainScanSummaries, getDomainScanWithProjectId } from '@/lib/db/scans';
import { buildDomainSummary } from '@/lib/domain-summary';
import type { AggregatedPerformance, AggregatedEco } from '@/lib/domain-aggregation';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const { id: projectId } = await context.params;
    if (!projectId) return apiError('Project ID required', API_STATUS.BAD_REQUEST);

    const project = await getProject(projectId, user.id);
    if (!project) return apiError('Project not found', API_STATUS.NOT_FOUND);

    const summaries = await listDomainScanSummaries(user.id, { projectId, limit: 1 });
    if (summaries.length === 0) {
        return NextResponse.json({
            success: true,
            data: null,
        });
    }

    const scanId = summaries[0]!.id;
    const row = await getDomainScanWithProjectId(scanId, user.id);
    if (!row) {
        return NextResponse.json({
            success: true,
            data: null,
        });
    }

    const summary = buildDomainSummary(row.result);

    const data = {
        scanId,
        score: summary.score ?? 0,
        totalPageCount: summary.totalPageCount ?? 0,
        aggregated: {
            performance: summary.aggregated?.performance as AggregatedPerformance | null | undefined,
            eco: summary.aggregated?.eco as AggregatedEco | null | undefined,
        },
    };

    return NextResponse.json({
        success: true,
        data,
    });
}
