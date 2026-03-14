/* GET /api/projects/[id]/domain-summary-all – own + competitor domain scan summaries for comparison. */
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getProject } from '@/lib/db/projects';
import { listDomainScanSummaries, getDomainScanWithProjectId } from '@/lib/db/scans';
import { getProjectDomainScanReferences } from '@/lib/db/project-domain-references';
import { buildDomainSummary } from '@/lib/domain-summary';
import type { AggregatedPerformance, AggregatedEco } from '@/lib/domain-aggregation';
import { computeWcagScore } from '@/lib/wcag-score';
import { computeSeoOnPageScore } from '@/lib/seo-on-page-score';

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

  type OwnSummary = {
    scanId: string;
    score: number;
    totalPageCount: number;
    wcagScore: number;
    seoOnPageScore: number;
    seoOnPageLabel: string;
    aggregated: { performance: AggregatedPerformance | null; eco: AggregatedEco | null };
  } | null;

  type CompetitorSummary = {
    scanId: string;
    score: number;
    totalPageCount: number;
    wcagScore: number;
    seoOnPageScore: number;
    seoOnPageLabel: string;
    status: string;
  } | null;

  let own: OwnSummary = null;
  const summaries = await listDomainScanSummaries(user.id, { projectId, limit: 1 });
  if (summaries.length > 0) {
    const scanId = summaries[0]!.id;
    const row = await getDomainScanWithProjectId(scanId, user.id);
    if (row) {
      const summary = buildDomainSummary(row.result);
      const pageCount = summary.totalPageCount ?? summary.pages?.length ?? (summary as { totalPages?: number }).totalPages ?? 0;
      const issuesStats = (summary.aggregated as { issues?: { stats?: { errors?: number; warnings?: number; notices?: number } } })?.issues?.stats;
      const wcag = computeWcagScore({
        errors: issuesStats?.errors ?? 0,
        warnings: issuesStats?.warnings ?? 0,
        notices: issuesStats?.notices ?? 0,
        totalPageCount: pageCount,
      });
      const seoOnPage = computeSeoOnPageScore({
        seo: summary.aggregated?.seo ?? null,
        structure: summary.aggregated?.structure ?? null,
      });
      own = {
        scanId,
        score: summary.score ?? 0,
        totalPageCount: pageCount,
        wcagScore: wcag.score,
        seoOnPageScore: seoOnPage.score,
        seoOnPageLabel: seoOnPage.label,
        aggregated: {
          performance: (summary.aggregated?.performance as AggregatedPerformance) ?? null,
          eco: (summary.aggregated?.eco as AggregatedEco) ?? null,
        },
      };
    }
  }

  const refs = await getProjectDomainScanReferences(projectId);
  const competitors: Record<string, CompetitorSummary> = {};
  for (const ref of refs) {
    const row = await getDomainScanWithProjectId(ref.domainScanId, user.id);
    if (!row) {
      competitors[ref.domain] = null;
      continue;
    }
    const status = (row.result as { status?: string }).status ?? 'unknown';
    if (status !== 'complete') {
      competitors[ref.domain] = {
        scanId: ref.domainScanId,
        score: 0,
        totalPageCount: 0,
        wcagScore: 0,
        seoOnPageScore: 0,
        seoOnPageLabel: 'critical',
        status,
      };
      continue;
    }
    const summary = buildDomainSummary(row.result);
    const pageCount = summary.totalPageCount ?? summary.pages?.length ?? (summary as { totalPages?: number }).totalPages ?? 0;
    const issuesStats = (summary.aggregated as { issues?: { stats?: { errors?: number; warnings?: number; notices?: number } } })?.issues?.stats;
    const wcag = computeWcagScore({
      errors: issuesStats?.errors ?? 0,
      warnings: issuesStats?.warnings ?? 0,
      notices: issuesStats?.notices ?? 0,
      totalPageCount: pageCount,
    });
    const seoOnPage = computeSeoOnPageScore({
      seo: summary.aggregated?.seo ?? null,
      structure: summary.aggregated?.structure ?? null,
    });
    competitors[ref.domain] = {
      scanId: ref.domainScanId,
      score: summary.score ?? 0,
      totalPageCount: pageCount,
      wcagScore: wcag.score,
      seoOnPageScore: seoOnPage.score,
      seoOnPageLabel: seoOnPage.label,
      status: 'complete',
    };
  }

  return NextResponse.json({
    success: true,
    data: { own, competitors },
  });
}
