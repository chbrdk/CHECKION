/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/domain/[id]/summary                        */
/*  Returns stored payload (slim pages + precomputed aggregated).       */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getDomainScanWithProjectId } from '@/lib/db/scans';
import { buildDomainSummary } from '@/lib/domain-summary';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await params;
    const row = await getDomainScanWithProjectId(id, user.id);
    if (!row) {
        return apiError('Scan not found', API_STATUS.NOT_FOUND);
    }
    const summary = buildDomainSummary(row.result);
    return NextResponse.json({ ...summary, projectId: row.projectId });
}
