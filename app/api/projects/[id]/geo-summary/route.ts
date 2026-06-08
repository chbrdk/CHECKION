/* GET /api/projects/[id]/geo-summary – uses shared lib/project-summaries/geo-summary.ts */
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getProject } from '@/lib/db/projects';
import { buildProjectGeoSummary, normalizeGeoDomain } from '@/lib/project-summaries/geo-summary';

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

    const projectDomain = project.domain ?? '';
    const competitorDomains = (project.competitors ?? [])
        .filter((c): c is string => typeof c === 'string' && c.trim() !== '')
        .map((c) => normalizeGeoDomain(c.trim().startsWith('http') ? c.trim() : `https://${c.trim()}`))
        .filter((d) => d !== normalizeGeoDomain(projectDomain));

    const summary = await buildProjectGeoSummary(
        project.userId,
        projectId,
        projectDomain,
        competitorDomains
    );

    return NextResponse.json({
        success: true,
        data: {
            score: summary.score,
            competitorScores: summary.competitorScores,
            runs: summary.runs,
        },
    });
}
