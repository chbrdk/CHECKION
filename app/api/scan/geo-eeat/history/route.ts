/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/geo-eeat/history                          */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { listGeoEeatRuns } from '@/lib/db/geo-eeat-runs';

export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10), 1), 100);
    const projectIdParam = searchParams.get('projectId');
    const projectId = projectIdParam === '' || projectIdParam === null ? null : projectIdParam ?? undefined;

    const runs = await listGeoEeatRuns(session.user.id, limit, projectId !== undefined ? { projectId } : undefined);
    return NextResponse.json({ runs, data: runs });
}
