/* POST /api/projects/[id]/domain-scan-all – start deep scan for own domain + all competitors (always new runs; project link via references). */
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { checkRateLimit } from '@/lib/rate-limit';
import { getProject } from '@/lib/db/projects';
import { normalizeDomain } from '@/lib/domain-normalize';
import { startDomainScan } from '@/lib/domain-scan-start';
import { startProjectCompetitorDomainScan } from '@/lib/project-competitor-domain-scan';

const MAX_COMPETITORS = 20;

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

  const skipUnchangedPages = req.nextUrl.searchParams.get('skipUnchangedPages') === 'true';
  const classifyPageTopics = req.nextUrl.searchParams.get('classifyPageTopics') === 'true';

  const own = project.domain?.trim() ? await (async () => {
    const raw = project.domain!.trim();
    const url = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
    const { id } = await startDomainScan(user.id, url, {
      projectId,
      useSitemap: true,
      ...(skipUnchangedPages ? { skipUnchangedPages: true } : {}),
      ...(classifyPageTopics ? { classifyPageTopics: true } : {}),
    });
    return { scanId: id, status: 'started' as const };
  })() : null;

  const competitorDomains = (project.competitors ?? [])
    .map((c) => normalizeDomain(c))
    .filter((d): d is string => !!d);
  const uniqueCompetitors = [...new Set(competitorDomains)].slice(0, MAX_COMPETITORS);

  /** Always start a new crawl per competitor (same as own domain). Reusing a completed scan skipped new work and hid rows in the UI (`reused`). */
  const competitors: Record<string, { scanId: string; reused: false }> = {};
  for (const domain of uniqueCompetitors) {
    const { scanId } = await startProjectCompetitorDomainScan(user.id, projectId, domain, {
      ...(skipUnchangedPages ? { skipUnchangedPages: true } : {}),
      ...(classifyPageTopics ? { classifyPageTopics: true } : {}),
    });
    competitors[domain] = { scanId, reused: false };
  }

  return NextResponse.json({
    success: true,
    data: {
      own,
      competitors,
    },
  });
}
