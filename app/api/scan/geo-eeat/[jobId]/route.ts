/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/geo-eeat/[jobId]                          */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getGeoEeatRun } from '@/lib/db/geo-eeat-runs';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await params;
    if (!jobId) {
        return NextResponse.json({ error: 'jobId required.' }, { status: 400 });
    }

    const run = await getGeoEeatRun(jobId, session.user.id);
    if (!run) {
        return NextResponse.json({ error: 'Run not found.' }, { status: 404 });
    }

    return NextResponse.json({
        jobId: run.id,
        url: run.url,
        status: run.status,
        payload: run.payload,
        error: run.error,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
    });
}
