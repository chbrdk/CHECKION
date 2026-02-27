/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/domain/[id]/status (polling during scan)   */
/*  Returns only status/progress fields to stay under Next.js 2MB      */
/*  cache limit; avoids getCachedDomainScan for this endpoint.        */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getDomainScan } from '@/lib/db/scans';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await params;
    const scan = await getDomainScan(id, session.user.id);

    if (!scan) {
        return apiError('Scan not found', API_STATUS.NOT_FOUND);
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
