/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/[id] (requires auth)                     */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getCachedScanWithSummary } from '@/lib/cache';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await params;
    const row = await getCachedScanWithSummary(id, session.user.id);

    if (!row) {
        return apiError('Scan result not found.', API_STATUS.NOT_FOUND);
    }

    return NextResponse.json({ ...row.result, llmSummary: row.llmSummary });
}
