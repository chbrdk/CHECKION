/* ------------------------------------------------------------------ */
/*  CHECKION – DELETE /api/rank-tracking/keywords/[id]                 */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { deleteKeyword } from '@/lib/db/rank-tracking-keywords';

export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getRequestUser(_request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    const { id } = await context.params;
    if (!id) return apiError('Keyword ID required', API_STATUS.BAD_REQUEST);

    const deleted = await deleteKeyword(id, user.id);
    if (!deleted) return apiError('Keyword not found', API_STATUS.NOT_FOUND);
    return NextResponse.json({ success: true });
}
