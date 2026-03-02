/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/geo-eeat/[jobId]/status                  */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getGeoEeatRun } from '@/lib/db/geo-eeat-runs';

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

    return NextResponse.json({
        jobId: run.id,
        status: run.status,
        error: run.error ?? undefined,
    });
}
