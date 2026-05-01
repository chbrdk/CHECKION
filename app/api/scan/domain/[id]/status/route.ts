/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/domain/[id]/status (polling during scan)   */
/*  Returns only status/progress fields to stay under Next.js 2MB      */
/*  cache limit; avoids getCachedDomainScan for this endpoint.        */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { isAdminApiRequest } from '@/lib/auth-admin-api';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getDomainScanAccess } from '@/lib/domain-scan-access';
import { getDomainScan } from '@/lib/db/scans';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const viewer = await getRequestUser(request);
    if (!viewer && !isAdminApiRequest(request)) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await params;
    const access = await getDomainScanAccess(request, id);
    if (!access.ok) {
        return apiError('Scan not found', API_STATUS.NOT_FOUND);
    }
    const scan = await getDomainScan(id, access.ownerUserId);

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
