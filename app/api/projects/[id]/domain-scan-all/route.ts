/* POST /api/projects/[id]/domain-scan-all – start deep scan for own domain + all competitors (reuse existing by domain). */
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { checkRateLimit } from '@/lib/rate-limit';
import { getProject } from '@/lib/db/projects';
import { getLatestCompletedDomainScanByDomain, upsertProjectDomainScanReference } from '@/lib/db/project-domain-references';
import { normalizeDomain } from '@/lib/domain-normalize';
import { startDomainScan } from '@/lib/domain-scan-start';

const MAX_COMPETITORS = 20;

export const maxDuration = 15;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getRequestUser(req);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

  const rl = checkRateLimit(`scan:${user.id}`);
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

  const own = project.domain?.trim() ? await (async () => {
    const { id } = await startDomainScan(user.id, project.domain!, {
      projectId,
      useSitemap: true,
    });
    return { scanId: id, status: 'started' as const };
  })() : null;

  const competitorDomains = (project.competitors ?? [])
    .map((c) => normalizeDomain(c))
    .filter((d): d is string => !!d);
  const uniqueCompetitors = [...new Set(competitorDomains)].slice(0, MAX_COMPETITORS);

  const competitors: Record<string, { scanId: string; reused?: boolean }> = {};
  for (const domain of uniqueCompetitors) {
    const existing = await getLatestCompletedDomainScanByDomain(user.id, domain);
    if (existing) {
      await upsertProjectDomainScanReference(projectId, domain, existing.id);
      competitors[domain] = { scanId: existing.id, reused: true };
    } else {
      const url = domain.startsWith('http') ? domain : `https://${domain}`;
      const { id } = await startDomainScan(user.id, url, {
        projectId: null,
        useSitemap: true,
        domainOverride: domain,
      });
      await upsertProjectDomainScanReference(projectId, domain, id);
      competitors[domain] = { scanId: id, reused: false };
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      own,
      competitors,
    },
  });
}
