/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/projects/[id]/report/latest                   */
/*  Returns the most recent completed report bundle (no LLM).          */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getProject } from '@/lib/db/projects';
import { getLatestCompleteProjectReportRun } from '@/lib/db/project-report-runs';

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

    const run = await getLatestCompleteProjectReportRun(project.userId, projectId);
    if (!run?.bundle) {
        return NextResponse.json({
            success: true,
            data: null,
        });
    }

    return NextResponse.json({
        success: true,
        data: {
            id: run.id,
            locale: run.locale,
            variant: run.variant,
            createdAt: run.createdAt.toISOString(),
            completedAt: run.completedAt?.toISOString() ?? null,
            bundle: run.bundle,
        },
    });
}
