/* ------------------------------------------------------------------ */
/*  CHECKION – GET/PATCH/DELETE /api/projects/[id]                    */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, projectUpdateBodySchema } from '@/lib/api-schemas';
import { getProject, updateProject, deleteProject } from '@/lib/db/projects';
import { getDomainScansCount } from '@/lib/db/scans';
import { listJourneyRuns } from '@/lib/db/journey-runs';
import { listGeoEeatRuns } from '@/lib/db/geo-eeat-runs';
import { getStandaloneScansCount } from '@/lib/db/scans';

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await context.params;
    if (!id) {
        return apiError('Project ID required', API_STATUS.BAD_REQUEST);
    }
    const project = await getProject(id, session.user.id);
    if (!project) {
        return apiError('Project not found', API_STATUS.NOT_FOUND);
    }
    const [domainScansCount, journeyRunsCount, geoEeatRunsCount, singleScansCount] = await Promise.all([
        getDomainScansCount(session.user.id, id),
        listJourneyRuns(session.user.id, 10000, { projectId: id }).then((r) => r.length),
        listGeoEeatRuns(session.user.id, 10000, { projectId: id }).then((r) => r.length),
        getStandaloneScansCount(session.user.id, id),
    ]);
    return NextResponse.json({
        success: true,
        data: {
            ...project,
            counts: {
                domainScans: domainScansCount,
                journeyRuns: journeyRunsCount,
                geoEeatRuns: geoEeatRunsCount,
                singleScans: singleScansCount,
            },
        },
    });
}

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
        return apiError('Project ID required', API_STATUS.BAD_REQUEST);
    }
    const parsed = await parseApiBody(request, projectUpdateBodySchema);
    if (parsed instanceof NextResponse) return parsed;
    const exists = await getProject(id, session.user.id);
    if (!exists) {
        return apiError('Project not found', API_STATUS.NOT_FOUND);
    }
    const updated = await updateProject(id, session.user.id, {
        ...(parsed.name !== undefined && { name: parsed.name }),
        ...(parsed.domain !== undefined && { domain: parsed.domain }),
    });
    return NextResponse.json({ success: updated });
}

export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await context.params;
    if (!id) {
        return apiError('Project ID required', API_STATUS.BAD_REQUEST);
    }
    const deleted = await deleteProject(id, session.user.id);
    if (!deleted) {
        return apiError('Project not found', API_STATUS.NOT_FOUND);
    }
    return NextResponse.json({ success: true });
}
