/* ------------------------------------------------------------------ */
/*  CHECKION – PATCH /api/scan/[id]/project (assign single scan)       */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, projectAssignmentBodySchema } from '@/lib/api-schemas';
import { updateScanProject } from '@/lib/db/scans';
import { getProject } from '@/lib/db/projects';

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await context.params;
    if (!id) {
        return apiError('Scan ID required', API_STATUS.BAD_REQUEST);
    }
    const parsed = await parseApiBody(request, projectAssignmentBodySchema);
    if (parsed instanceof NextResponse) return parsed;
    if (parsed.projectId !== null) {
        const project = await getProject(parsed.projectId, session.user.id);
        if (!project) {
            return apiError('Project not found', API_STATUS.NOT_FOUND);
        }
    }
    const updated = await updateScanProject(id, session.user.id, parsed.projectId);
    if (!updated) {
        return apiError('Scan not found', API_STATUS.NOT_FOUND);
    }
    return NextResponse.json({ success: true, projectId: parsed.projectId });
}
