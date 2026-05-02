/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/[id]/issues (WCAG issues from scan_issues) */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getDb } from '@/lib/db/index';
import { listScanIssuesForScanId } from '@/lib/db/scan-issues-persist';
import { getScan } from '@/lib/db/scans';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await params;
    const scanResult = await getScan(id, user.id);
    if (!scanResult) {
        return apiError('Scan result not found.', API_STATUS.NOT_FOUND);
    }

    const db = getDb();
    const issues = await listScanIssuesForScanId(db, id);

    return NextResponse.json({
        success: true,
        count: issues.length,
        data: issues,
    });
}
