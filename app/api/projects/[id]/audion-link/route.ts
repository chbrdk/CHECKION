/* ------------------------------------------------------------------ */
/*  CHECKION – GET/PUT /api/projects/[id]/audion-link                 */
/*  AUDION audience link status + manual linking from CHECKION UI.  */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody } from '@/lib/api-schemas';
import { getProject, getProjectPlatformIds } from '@/lib/db/projects';
import { fetchAudionAudienceReport } from '@/lib/integrations/audion-audience-client';
import {
    linkCheckionProjectToAudion,
    listAudionProjectsForLink,
} from '@/lib/integrations/audion-link-client';
import { getAudionIntegrationEnvSnapshot } from '@/lib/paths/audion-api';

const linkBodySchema = z.object({
    audionProjectId: z.string().uuid(),
});

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const { id: projectId } = await context.params;
    const project = await getProject(projectId, user.id);
    if (!project) return apiError('Project not found', API_STATUS.NOT_FOUND);

    const audionEnv = getAudionIntegrationEnvSnapshot();
    if (!audionEnv.configured) {
        return NextResponse.json({
            success: true,
            data: {
                configured: false,
                linked: false,
                reason: 'audion_not_configured',
                configMissing: audionEnv.missing,
                wrongTokenOnCheckion: audionEnv.checkionInboundTokenSet,
                platformProjectId: null,
                audionProjectId: null,
                audionProjectName: null,
                personaCount: 0,
                audionProjects: [],
            },
        });
    }

    const platform = await getProjectPlatformIds(projectId);
    const audience = await fetchAudionAudienceReport(projectId, {
        platformProjectId: platform?.platformProjectId,
    });

    const listProjects = request.nextUrl.searchParams.get('list') === '1';
    const audionProjects = listProjects ? await listAudionProjectsForLink() : null;

    return NextResponse.json({
        success: true,
        data: {
            configured: true,
            linked: audience?.available === true,
            reason: audience?.available ? null : (audience?.reason ?? 'audion_fetch_failed'),
            resolvedVia: audience?.resolvedVia ?? null,
            platformProjectId: platform?.platformProjectId ?? null,
            audionProjectId: audience?.audionProjectId ?? null,
            audionProjectName: audience?.audionProjectName ?? null,
            personaCount: audience?.personas?.length ?? 0,
            audionProjects: audionProjects ?? undefined,
        },
    });
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const { id: projectId } = await context.params;
    const project = await getProject(projectId, user.id);
    if (!project) return apiError('Project not found', API_STATUS.NOT_FOUND);

    if (!getAudionIntegrationEnvSnapshot().configured) {
        return apiError('AUDION integration not configured', API_STATUS.UNAVAILABLE);
    }

    const parsed = await parseApiBody(request, linkBodySchema);
    if (parsed instanceof NextResponse) return parsed;

    const result = await linkCheckionProjectToAudion(projectId, parsed.audionProjectId);
    if (!result.ok) {
        return apiError(result.error ?? 'Link failed', API_STATUS.BAD_REQUEST);
    }

    return NextResponse.json({
        success: true,
        data: {
            audionProjectId: parsed.audionProjectId,
            audionProjectName: result.audionProjectName ?? null,
        },
    });
}
