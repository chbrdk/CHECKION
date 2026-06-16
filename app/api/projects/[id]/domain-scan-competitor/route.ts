/* POST /api/projects/[id]/domain-scan-competitor – start one competitor deep scan and link reference. */
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { checkRateLimit } from '@/lib/rate-limit';
import { getProject } from '@/lib/db/projects';
import { normalizeDomain } from '@/lib/domain-normalize';
import { parseApiBody, projectCompetitorDomainScanBodySchema } from '@/lib/api-schemas';
import { startProjectCompetitorDomainScan } from '@/lib/project-competitor-domain-scan';
import {
    hasPriorCompetitorCompleteScan,
    resolveSkipUnchangedPagesFromQuery,
} from '@/lib/competitor-scan-skip-default';

export const maxDuration = 15;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getRequestUser(req);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

  const rl = await checkRateLimit(`scan:${user.id}`, 'default');
  if (!rl.allowed) {
    return apiError(
      'Too many requests. Please try again later.',
      API_STATUS.TOO_MANY_REQUESTS,
      rl.retryAfter ? { retryAfter: rl.retryAfter } : undefined
    );
  }

  const { id: projectId } = await context.params;
  if (!projectId) return apiError('Project ID required', API_STATUS.BAD_REQUEST);

  const project = await getProject(projectId, user.id);
  if (!project) return apiError('Project not found', API_STATUS.NOT_FOUND);
  const projectUserId = project.userId;

  const parsed = await parseApiBody(req, projectCompetitorDomainScanBodySchema);
  if (parsed instanceof NextResponse) return parsed;

  const normalized = normalizeDomain(parsed.domain);
  if (!normalized) {
    return apiError('Invalid domain', API_STATUS.BAD_REQUEST);
  }

  const competitorNorms = (project.competitors ?? [])
    .map((c) => normalizeDomain(c))
    .filter((d): d is string => !!d);
  const allowed = new Set(competitorNorms);
  if (!allowed.has(normalized)) {
    return apiError('Domain is not a competitor on this project', API_STATUS.BAD_REQUEST);
  }

  const hasPrior = await hasPriorCompetitorCompleteScan(projectUserId, normalized);
  const skipUnchangedPages = resolveSkipUnchangedPagesFromQuery(req.nextUrl.searchParams, hasPrior);
  const classifyPageTopics = req.nextUrl.searchParams.get('classifyPageTopics') === 'true';
  const aiFillProjectMetadataDisabled = req.nextUrl.searchParams.get('aiFillProjectMetadata') === 'false';

  const { scanId } = await startProjectCompetitorDomainScan(projectUserId, projectId, normalized, {
    ...(skipUnchangedPages ? { skipUnchangedPages: true } : {}),
    ...(classifyPageTopics ? { classifyPageTopics: true } : {}),
    ...(aiFillProjectMetadataDisabled ? { aiFillProjectMetadata: false } : {}),
  });

  return NextResponse.json({
    success: true,
    data: {
      domain: normalized,
      scanId,
    },
  });
}
