/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/projects/[id]/report/latest/pptx               */
/*  Re-export last saved report bundle as PowerPoint (no LLM).        */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getProject } from '@/lib/db/projects';
import { getLatestCompleteProjectReportRun } from '@/lib/db/project-report-runs';
import { renderProjectReportPptxFromBundle } from '@/lib/project-report/pptx/render-pptx';

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

    const run = await getLatestCompleteProjectReportRun(project.userId, projectId);
    if (!run?.bundle) {
        return NextResponse.json({ success: false, error: 'no_report' }, { status: 404 });
    }

    try {
        const buffer = await renderProjectReportPptxFromBundle(run.bundle);
        const slug = run.bundle.project.name.replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
        const date = new Date(run.bundle.generatedAt).toISOString().slice(0, 10);
        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                'Content-Type':
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'Content-Disposition': `attachment; filename="checkion-report-${slug}-${date}.pptx"`,
                'Cache-Control': 'private, max-age=60',
            },
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'pptx_render_failed';
        const stack = e instanceof Error ? e.stack : undefined;
        console.error('[report/latest/pptx]', message, stack);
        return NextResponse.json({ success: false, error: 'pptx_render_failed' }, { status: 503 });
    }
}
