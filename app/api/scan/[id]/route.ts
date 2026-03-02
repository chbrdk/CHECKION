/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/[id] (requires auth)                     */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getCachedScanWithSummary } from '@/lib/cache';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await params;
    const row = await getCachedScanWithSummary(id, user.id);

    if (!row) {
        return apiError('Scan result not found.', API_STATUS.NOT_FOUND);
    }

    return NextResponse.json({ ...row.result, llmSummary: row.llmSummary, projectId: row.projectId ?? null });
}
