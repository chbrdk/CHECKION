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
import { projectTrackDomain } from '@/lib/project-track-domain';
import { resolveIntentFields } from '@/lib/serp-intent';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) return apiError('projectId is required', API_STATUS.BAD_REQUEST);
    const project = await getProject(projectId, user.id);
    if (!project) return apiError('Project not found', API_STATUS.NOT_FOUND);
    const projectUserId = project.userId;

    const keywords = await listKeywordsByProject(projectUserId, projectId);
    const ids = keywords.map((k) => k.id);
    const lastPositions = await getLastPositionsByKeywordIds(ids);

    const data = keywords.map((k) => {
        const last = lastPositions.get(k.id);
        return {
            id: k.id,
            domain: k.domain,
            keyword: k.keyword,
            country: k.country,
            language: k.language,
            intentKey: k.intentKey ?? undefined,
            intentLabel: k.intentLabel ?? undefined,
            device: k.device,
            lastPosition: last?.position ?? undefined,
            lastRecordedAt: last?.recordedAt?.toISOString() ?? undefined,
            lastCompetitorPositions: last?.competitorPositions ?? undefined,
            lastSerpLeaderDomain: last?.serpLeaderDomain ?? undefined,
            lastSerpLeaderUrl: last?.serpLeaderUrl ?? undefined,
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
    const projectUserId = project.userId;

    const domain = (parsed.domain?.trim() || projectTrackDomain(project.domain) || '').trim();
    if (!domain) {
        return apiError('Project has no domain. Set company URL on the project first.', API_STATUS.BAD_REQUEST);
    }

    const { intentKey, intentLabel } = resolveIntentFields(
        parsed.keyword,
        parsed.intentKey,
        parsed.intentLabel
    );
    const id = uuidv4();
    await insertKeyword(id, projectUserId, parsed.projectId, {
        domain,
        keyword: parsed.keyword,
        country: parsed.country,
        language: parsed.language,
        intentKey,
        intentLabel,
        device: parsed.device ?? undefined,
    });
    return NextResponse.json({ success: true, id });
}
