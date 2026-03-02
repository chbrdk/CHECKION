/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/geo-eeat/[jobId]/competitive-history       */
/*  List competitive benchmark runs for this job (metadata only).     */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getGeoEeatRun } from '@/lib/db/geo-eeat-runs';
import { listCompetitiveRunsByGeoEeatJob } from '@/lib/db/geo-eeat-competitive-runs';

const DEFAULT_LIMIT = 20;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }

    const { jobId } = await params;
    if (!jobId) {
        return apiError('jobId required.', API_STATUS.BAD_REQUEST);
    }

    const run = await getGeoEeatRun(jobId, user.id);
    if (!run) {
        return apiError('Run not found.', API_STATUS.NOT_FOUND);
    }

    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 100) : DEFAULT_LIMIT;

    const rows = await listCompetitiveRunsByGeoEeatJob(jobId, user.id, limit);

    const runs = rows.map((r) => ({
        id: r.id,
        started_at: r.startedAt,
        completed_at: r.completedAt,
        status: r.status,
        queryCount: Array.isArray(r.queries) ? r.queries.length : 0,
        competitorCount: Array.isArray(r.competitors) ? r.competitors.length : 0,
        modelCount:
            r.status === 'complete' && r.competitiveByModel && typeof r.competitiveByModel === 'object'
                ? Object.keys(r.competitiveByModel).length
                : undefined,
    }));

    return NextResponse.json({ runs });
}
