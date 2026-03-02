/* ------------------------------------------------------------------ */
/*  CHECKION – PATCH /api/scan/[id]/project (assign single scan)       */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, projectAssignmentBodySchema } from '@/lib/api-schemas';
import { updateScanProject } from '@/lib/db/scans';
import { getProject } from '@/lib/db/projects';

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await context.params;
    if (!id) {
        return apiError('Scan ID required', API_STATUS.BAD_REQUEST);
    }
    const parsed = await parseApiBody(request, projectAssignmentBodySchema);
    if (parsed instanceof NextResponse) return parsed;
    if (parsed.projectId !== null) {
        const project = await getProject(parsed.projectId, user.id);
        if (!project) {
            return apiError('Project not found', API_STATUS.NOT_FOUND);
        }
    }
    const updated = await updateScanProject(id, user.id, parsed.projectId);
    if (!updated) {
        return apiError('Scan not found', API_STATUS.NOT_FOUND);
    }
    return NextResponse.json({ success: true, projectId: parsed.projectId });
}
