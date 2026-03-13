/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/rank-tracking/keywords/[id]/positions          */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getKeyword } from '@/lib/db/rank-tracking-keywords';
import { listPositionsByKeyword } from '@/lib/db/rank-tracking-positions';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    const { id } = await context.params;
    if (!id) return apiError('Keyword ID required', API_STATUS.BAD_REQUEST);

    const keyword = await getKeyword(id, user.id);
    if (!keyword) return apiError('Keyword not found', API_STATUS.NOT_FOUND);

    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 365) : 90;
    const positions = await listPositionsByKeyword(id, user.id, limit);
    const data = positions.map((p) => ({
        position: p.position,
        recordedAt: p.recordedAt.toISOString(),
        competitorPositions: p.competitorPositions ?? undefined,
    }));
    return NextResponse.json({ success: true, data });
}
