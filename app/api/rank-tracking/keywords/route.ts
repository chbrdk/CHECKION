/* ------------------------------------------------------------------ */
/*  CHECKION – GET/POST /api/rank-tracking/keywords                    */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, rankTrackingKeywordCreateBodySchema } from '@/lib/api-schemas';
import { getProject } from '@/lib/db/projects';
import {
    listKeywordsByProject,
    insertKeyword,
} from '@/lib/db/rank-tracking-keywords';
import { getLastPositionsByKeywordIds } from '@/lib/db/rank-tracking-positions';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) return apiError('projectId is required', API_STATUS.BAD_REQUEST);
    const project = await getProject(projectId, user.id);
    if (!project) return apiError('Project not found', API_STATUS.NOT_FOUND);

    const keywords = await listKeywordsByProject(user.id, projectId);
    const ids = keywords.map((k) => k.id);
    const lastPositions = await getLastPositionsByKeywordIds(ids);

    const data = keywords.map((k) => {
        const last = lastPositions.get(k.id);
        return {
            id: k.id,
            domain: k.domain,
            keyword: k.keyword,
            country: k.country,
            device: k.device,
            lastPosition: last?.position ?? undefined,
            lastRecordedAt: last?.recordedAt?.toISOString() ?? undefined,
        };
    });
    return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    const parsed = await parseApiBody(request, rankTrackingKeywordCreateBodySchema);
    if (parsed instanceof NextResponse) return parsed;

    const project = await getProject(parsed.projectId, user.id);
    if (!project) return apiError('Project not found', API_STATUS.NOT_FOUND);

    const id = uuidv4();
    await insertKeyword(id, user.id, parsed.projectId, {
        domain: parsed.domain,
        keyword: parsed.keyword,
        country: parsed.country ?? undefined,
        device: parsed.device ?? undefined,
    });
    return NextResponse.json({ success: true, id });
}
