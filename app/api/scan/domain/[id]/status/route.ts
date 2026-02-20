/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/domain/[id]/status (polling during scan)   */
/*  Returns only status/progress fields to stay under Next.js 2MB      */
/*  cache limit; avoids getCachedDomainScan for this endpoint.        */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDomainScan } from '@/lib/db/scans';

export async function GET(
    _req: NextRequest,
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

    return NextResponse.json({
        id: scan.id,
        domain: scan.domain,
        timestamp: scan.timestamp,
        status: scan.status,
        progress: scan.progress,
        totalPages: scan.totalPages,
        score: scan.score,
        error: scan.error,
    });
}
