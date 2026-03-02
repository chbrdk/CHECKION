/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/geo-eeat/[jobId]/competitive-history/[runId] */
/*  Single competitive benchmark run (full competitiveByModel).         */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getGeoEeatRun } from '@/lib/db/geo-eeat-runs';
import { getCompetitiveRun } from '@/lib/db/geo-eeat-competitive-runs';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string; runId: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }

    const { jobId, runId } = await params;
    if (!jobId || !runId) {
        return apiError('jobId and runId required.', API_STATUS.BAD_REQUEST);
    }

    const run = await getGeoEeatRun(jobId, user.id);
    if (!run) {
        return apiError('Run not found.', API_STATUS.NOT_FOUND);
    }

    const competitiveRun = await getCompetitiveRun(runId, user.id);
    if (!competitiveRun || competitiveRun.geoEeatRunId !== jobId) {
        return apiError('Competitive run not found.', API_STATUS.NOT_FOUND);
    }

    return NextResponse.json({
        id: competitiveRun.id,
        started_at: competitiveRun.startedAt,
        completed_at: competitiveRun.completedAt,
        status: competitiveRun.status,
        competitiveByModel: competitiveRun.competitiveByModel ?? undefined,
        queries: competitiveRun.queries,
        competitors: competitiveRun.competitors,
        error: competitiveRun.error ?? undefined,
    });
}
