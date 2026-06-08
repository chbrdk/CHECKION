/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/projects/[id]/report                         */
/*  Starts async project executive report generation.                 */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, projectReportBodySchema } from '@/lib/api-schemas';
import { getProject } from '@/lib/db/projects';
import { insertProjectReportRun } from '@/lib/db/project-report-runs';
import { runProjectReportJob } from '@/lib/project-report/run-job';
import { apiProjectReportRun } from '@/lib/constants';
import type { ProjectReportLocale, ProjectReportVariant } from '@/lib/project-report/types';

export const maxDuration = 60;

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const { id: projectId } = await context.params;
    if (!projectId) return apiError('Project ID required', API_STATUS.BAD_REQUEST);

    const project = await getProject(projectId, user.id);
    if (!project) return apiError('Project not found', API_STATUS.NOT_FOUND);

    const parsed = await parseApiBody(request, projectReportBodySchema);
    if (parsed instanceof NextResponse) return parsed;

    const locale: ProjectReportLocale = parsed.locale ?? 'de';
    const variant: ProjectReportVariant = parsed.variant ?? 'executive';
    const runId = uuidv4();

    await insertProjectReportRun(runId, project.userId, projectId, { locale, variant });

    runProjectReportJob({
        runId,
        projectId,
        viewerUserId: user.id,
        ownerUserId: project.userId,
        locale,
        variant,
        skipLlm: parsed.skipLlm,
    });

    return NextResponse.json({
        success: true,
        data: {
            runId,
            status: 'queued',
            pollUrl: apiProjectReportRun(projectId, runId),
        },
    });
}

/** GET – list recent report runs for project */
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

    const { listProjectReportRuns } = await import('@/lib/db/project-report-runs');
    const runs = await listProjectReportRuns(project.userId, projectId, 10);

    return NextResponse.json({
        success: true,
        data: runs.map((r) => ({
            id: r.id,
            status: r.status,
            locale: r.locale,
            variant: r.variant,
            error: r.error,
            createdAt: r.createdAt.toISOString(),
            completedAt: r.completedAt?.toISOString() ?? null,
            hasBundle: r.bundle != null,
            progress: r.progress,
        })),
    });
}
