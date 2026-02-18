/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/journey-agent/history                    */
/*  List UX Journey Agent runs for the current user (newest first).   */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listJourneyRuns } from '@/lib/db/journey-runs';

export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10), 1), 100);

    const runs = await listJourneyRuns(session.user.id, limit);
    return NextResponse.json({ runs });
}
