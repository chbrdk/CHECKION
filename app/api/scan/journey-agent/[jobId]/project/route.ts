/* ------------------------------------------------------------------ */
/*  CHECKION – PATCH /api/scan/journey-agent/[jobId]/project          */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, projectAssignmentBodySchema } from '@/lib/api-schemas';
import { resolveJourneyRunProjectAssignmentContext, updateJourneyRunProject } from '@/lib/db/journey-runs';
import { getProject } from '@/lib/db/projects';
import { uxJourneyAgentEnabled } from '@/lib/ux-journey-agent-enabled';

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ jobId: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    if (!uxJourneyAgentEnabled()) {
        return apiError('Not found', API_STATUS.NOT_FOUND);
    }
    const { jobId } = await context.params;
    if (!jobId) {
        return apiError('Job ID required', API_STATUS.BAD_REQUEST);
    }
    const parsed = await parseApiBody(request, projectAssignmentBodySchema);
    if (parsed instanceof NextResponse) return parsed;
    const contextRow = await resolveJourneyRunProjectAssignmentContext(jobId, user.id);
    if (!contextRow) {
        return apiError('Journey run not found', API_STATUS.NOT_FOUND);
    }
    let resourceUserId = contextRow.resourceUserId;
    if (parsed.projectId !== null) {
        const project = await getProject(parsed.projectId, user.id);
        if (!project) {
            return apiError('Project not found', API_STATUS.NOT_FOUND);
        }
        if (project.userId !== contextRow.resourceUserId) {
            return apiError('Cannot move journey run across different project owners', API_STATUS.BAD_REQUEST);
        }
        resourceUserId = contextRow.resourceUserId;
    }
    const updated = await updateJourneyRunProject(jobId, resourceUserId, parsed.projectId);
    if (!updated) {
        return apiError('Journey run not found', API_STATUS.NOT_FOUND);
    }
    return NextResponse.json({ success: true, projectId: parsed.projectId });
}
