/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/projects/[id]/report/[runId]                  */
/*  Poll report job status; returns bundle when complete.             */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getProject } from '@/lib/db/projects';
import { getProjectReportRun } from '@/lib/db/project-report-runs';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string; runId: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const { id: projectId, runId } = await context.params;
    if (!projectId || !runId) {
        return apiError('Project ID and run ID required', API_STATUS.BAD_REQUEST);
    }

    const project = await getProject(projectId, user.id);
    if (!project) return apiError('Project not found', API_STATUS.NOT_FOUND);

    const run = await getProjectReportRun(runId, project.userId);
    if (!run || run.projectId !== projectId) {
        return apiError('Report run not found', API_STATUS.NOT_FOUND);
    }

    return NextResponse.json({
        success: true,
        data: {
            id: run.id,
            status: run.status,
            locale: run.locale,
            variant: run.variant,
            error: run.error,
            createdAt: run.createdAt.toISOString(),
            completedAt: run.completedAt?.toISOString() ?? null,
            progress: run.progress,
            bundle: run.status === 'complete' ? run.bundle : null,
        },
    });
}
