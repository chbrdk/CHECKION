/* GET /api/projects/[id]/competitor-changes – scan diffs since previous crawl (own + competitors). */
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getProject } from '@/lib/db/projects';
import { buildProjectCompetitorChanges } from '@/lib/project-competitor-changes';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const user = await getRequestUser(req);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const { id: projectId } = await context.params;
    if (!projectId) return apiError('Project ID required', API_STATUS.BAD_REQUEST);

    const project = await getProject(projectId, user.id);
    if (!project) return apiError('Project not found', API_STATUS.NOT_FOUND);

    const lazyCompute = req.nextUrl.searchParams.get('lazy') !== 'false';
    const { own, competitors } = await buildProjectCompetitorChanges(
        project.userId,
        projectId,
        { lazyCompute },
    );

    return NextResponse.json({
        success: true,
        data: { own, competitors },
    });
}
