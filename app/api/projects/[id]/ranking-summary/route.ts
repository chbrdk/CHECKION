/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/projects/[id]/ranking-summary                  */
/*  Returns aggregate ranking score (0–100), keyword count, lastUpdated. */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getProject } from '@/lib/db/projects';
import { listKeywordsByProject } from '@/lib/db/rank-tracking-keywords';
import { getLastPositionsByKeywordIds } from '@/lib/db/rank-tracking-positions';

/** Position 1 → 100, 2 → 90, …, 10 → 10, 11+ → 0 */
function positionToPoints(position: number | null): number {
    if (position == null || position < 1) return 0;
    if (position <= 10) return 110 - 10 * position;
    return 0;
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const { id: projectId } = await context.params;
    if (!projectId) return apiError('Project ID required', API_STATUS.BAD_REQUEST);

    const project = await getProject(projectId, user.id);
    if (!project) return apiError('Project not found', API_STATUS.NOT_FOUND);

    const keywords = await listKeywordsByProject(user.id, projectId);
    const keywordIds = keywords.map((k) => k.id);
    if (keywordIds.length === 0) {
        return NextResponse.json({
            success: true,
            data: { score: null, keywordCount: 0, lastUpdated: null },
        });
    }

    const lastPositions = await getLastPositionsByKeywordIds(keywordIds);
    let sumPoints = 0;
    let countWithPosition = 0;
    let lastUpdated: string | null = null;

    for (const [, data] of lastPositions) {
        const points = positionToPoints(data.position);
        if (data.position != null && data.position >= 1) {
            sumPoints += points;
            countWithPosition += 1;
        }
        if (data.recordedAt) {
            const iso = data.recordedAt.toISOString();
            if (!lastUpdated || iso > lastUpdated) lastUpdated = iso;
        }
    }

    const score = countWithPosition > 0 ? Math.round(sumPoints / countWithPosition) : null;

    return NextResponse.json({
        success: true,
        data: {
            score,
            keywordCount: keywords.length,
            lastUpdated,
        },
    });
}
