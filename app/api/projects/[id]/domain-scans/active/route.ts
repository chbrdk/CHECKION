/* GET /api/projects/[id]/domain-scans/active – in-flight deep scans (own + linked competitors) */
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getProject } from '@/lib/db/projects';
import { listActiveDomainScansForProject } from '@/lib/db/scans';

export const maxDuration = 10;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getRequestUser(req);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

  const { id: projectId } = await context.params;
  if (!projectId) return apiError('Project ID required', API_STATUS.BAD_REQUEST);

  const project = await getProject(projectId, user.id);
  if (!project) return apiError('Project not found', API_STATUS.NOT_FOUND);
  const projectUserId = project.userId;

  const scans = await listActiveDomainScansForProject(projectUserId, projectId);

  return NextResponse.json({
    success: true,
    data: { scans },
  });
}
