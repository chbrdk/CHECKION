/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/rank-tracking/keywords/[id]/serp-preview       */
/*  Returns stored organic SERP listings from the latest snapshot.   */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getProject } from '@/lib/db/projects';
import { getKeyword, getKeywordById } from '@/lib/db/rank-tracking-keywords';
import { getLastSerpOrganicForKeyword } from '@/lib/db/rank-tracking-positions';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    const { id } = await context.params;
    if (!id) return apiError('Keyword ID required', API_STATUS.BAD_REQUEST);

    const ownKeyword = await getKeyword(id, user.id);
    const keyword = ownKeyword ?? await getKeywordById(id);
    if (!keyword) return apiError('Keyword not found', API_STATUS.NOT_FOUND);
    if (keyword.userId !== user.id) {
        if (!keyword.projectId) return apiError('Keyword not found', API_STATUS.NOT_FOUND);
        const project = await getProject(keyword.projectId, user.id);
        if (!project) return apiError('Keyword not found', API_STATUS.NOT_FOUND);
    }

    const snapshot = await getLastSerpOrganicForKeyword(id, keyword.userId);
    if (!snapshot) {
        return apiError('No SERP snapshot yet. Refresh rankings first.', API_STATUS.NOT_FOUND);
    }

    return NextResponse.json({
        success: true,
        data: {
            keyword: keyword.keyword,
            domain: keyword.domain,
            country: keyword.country,
            language: keyword.language,
            device: keyword.device ?? undefined,
            position: snapshot.position,
            recordedAt: snapshot.recordedAt.toISOString(),
            organic: snapshot.organic,
        },
    });
}
