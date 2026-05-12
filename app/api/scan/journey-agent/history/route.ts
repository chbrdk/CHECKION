/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/journey-agent/history                    */
/*  List UX Journey Agent runs for the current user (newest first).   */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { listJourneyRuns, listSharedProjectJourneyRuns } from '@/lib/db/journey-runs';
import { getProject, listProjects } from '@/lib/db/projects';
import { uxJourneyAgentEnabled } from '@/lib/ux-journey-agent-enabled';

export async function GET(request: Request) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    if (!uxJourneyAgentEnabled()) {
        return apiError('Not found', API_STATUS.NOT_FOUND);
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10), 1), 100);
    const projectIdParam = searchParams.get('projectId');
    const projectId =
        projectIdParam === null
            ? undefined
            : projectIdParam === ''
              ? null
              : projectIdParam;
    let effectiveUserId = user.id;
    if (typeof projectId === 'string') {
        const project = await getProject(projectId, user.id);
        if (!project) {
            return apiError('Project not found', API_STATUS.NOT_FOUND);
        }
        effectiveUserId = project.userId;
    }

    if (projectId === undefined) {
        const sharedProjectIds = (await listProjects(user.id))
            .filter((project) => project.userId !== user.id)
            .map((project) => project.id);
        const [ownRuns, sharedRuns] = await Promise.all([
            listJourneyRuns(user.id, limit),
            sharedProjectIds.length > 0
                ? listSharedProjectJourneyRuns(sharedProjectIds, limit)
                : Promise.resolve([]),
        ]);
        const runs = [...ownRuns, ...sharedRuns]
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
        return NextResponse.json({ data: runs, runs });
    }

    const runs = await listJourneyRuns(effectiveUserId, limit, projectId !== undefined ? { projectId } : undefined);
    return NextResponse.json({ data: runs, runs });
}
