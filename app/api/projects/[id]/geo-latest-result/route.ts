/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/projects/[id]/geo-latest-result              */
/*  Returns latest complete GEO run with full payload for analysis page. */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getProject } from '@/lib/db/projects';
import { listGeoEeatRuns } from '@/lib/db/geo-eeat-runs';

const RUNS_LIMIT = 20;

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

  const runs = await listGeoEeatRuns(user.id, RUNS_LIMIT, { projectId });
  const completeRun = runs.find((r) => r.status === 'complete' && r.payload != null);

  if (!completeRun || !completeRun.payload) {
    return NextResponse.json({ success: true, data: null });
  }

  return NextResponse.json({
    success: true,
    data: {
      runId: completeRun.id,
      runUrl: completeRun.url,
      createdAt: completeRun.createdAt.toISOString(),
      payload: completeRun.payload,
    },
  });
}
