/* ------------------------------------------------------------------ */
/*  CHECKION – PATCH /api/scans/domain/[id]/project (assign domain)   */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, projectAssignmentBodySchema } from '@/lib/api-schemas';
import { updateDomainScanProject } from '@/lib/db/scans';
import { getProject } from '@/lib/db/projects';

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const resolved = await context.params;
    const id = resolved?.id;
    if (!id) {
        return apiError('Domain scan ID required', API_STATUS.BAD_REQUEST);
    }
    const parsed = await parseApiBody(request, projectAssignmentBodySchema);
    if (parsed instanceof NextResponse) return parsed;
    if (parsed.projectId !== null) {
        const project = await getProject(parsed.projectId, user.id);
        if (!project) {
            return apiError('Project not found', API_STATUS.NOT_FOUND);
        }
    }
    const updated = await updateDomainScanProject(id, user.id, parsed.projectId);
    if (!updated) {
        return apiError('Domain scan not found', API_STATUS.NOT_FOUND);
    }
    return NextResponse.json({ success: true, projectId: parsed.projectId });
}
