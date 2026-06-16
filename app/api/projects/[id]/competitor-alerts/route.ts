/* GET/PATCH /api/projects/[id]/competitor-alerts */
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getProject } from '@/lib/db/projects';
import {
    listUnreadCompetitorChangeAlerts,
    markCompetitorChangeAlertsRead,
} from '@/lib/db/competitor-change-alerts';

export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const user = await getRequestUser(_req);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const { id: projectId } = await context.params;
    const project = await getProject(projectId, user.id);
    if (!project) return apiError('Project not found', API_STATUS.NOT_FOUND);

    const alerts = await listUnreadCompetitorChangeAlerts(projectId, project.userId);
    return NextResponse.json({ success: true, data: { alerts } });
}

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const user = await getRequestUser(req);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const { id: projectId } = await context.params;
    const project = await getProject(projectId, user.id);
    if (!project) return apiError('Project not found', API_STATUS.NOT_FOUND);

    const body = (await req.json().catch(() => ({}))) as { alertIds?: string[] };
    const marked = await markCompetitorChangeAlertsRead(
        projectId,
        project.userId,
        body.alertIds,
    );
    return NextResponse.json({ success: true, data: { marked } });
}
