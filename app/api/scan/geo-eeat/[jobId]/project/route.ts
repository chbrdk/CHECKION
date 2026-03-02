/* ------------------------------------------------------------------ */
/*  CHECKION – PATCH /api/scan/geo-eeat/[jobId]/project                */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, projectAssignmentBodySchema } from '@/lib/api-schemas';
import { updateGeoEeatRunProject } from '@/lib/db/geo-eeat-runs';
import { getProject } from '@/lib/db/projects';

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ jobId: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { jobId } = await context.params;
    if (!jobId) {
        return apiError('Job ID required', API_STATUS.BAD_REQUEST);
    }
    const parsed = await parseApiBody(request, projectAssignmentBodySchema);
    if (parsed instanceof NextResponse) return parsed;
    if (parsed.projectId !== null) {
        const project = await getProject(parsed.projectId, user.id);
        if (!project) {
            return apiError('Project not found', API_STATUS.NOT_FOUND);
        }
    }
    const updated = await updateGeoEeatRunProject(jobId, user.id, parsed.projectId);
    if (!updated) {
        return apiError('GEO/E-E-A-T run not found', API_STATUS.NOT_FOUND);
    }
    return NextResponse.json({ success: true, projectId: parsed.projectId });
}
