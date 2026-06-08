/**
 * Deep data collection for comprehensive / full project reports.
 */

import { getDomainScansCount, getStandaloneScansCount, getDomainScanWithProjectId } from '@/lib/db/scans';
import { buildDomainSummary } from '@/lib/domain-summary';
import { getKeywordsCountByProject } from '@/lib/db/rank-tracking-keywords';
import { listKeywordsByProject } from '@/lib/db/rank-tracking-keywords';
import { listPositionsByKeyword, getLastPositionsByKeywordIds } from '@/lib/db/rank-tracking-positions';
import { listGeoEeatRuns } from '@/lib/db/geo-eeat-runs';
import { listIssueGroupsPaged } from '@/lib/db/domain-issues';
import { buildProjectGeoQuestionHistory, normalizeProjectDomainHost } from '@/lib/project-summaries/geo-question-history';
import { buildMetricInsights } from '@/lib/project-report/metrics-builder';
import { buildCompetitiveBenchmark } from '@/lib/project-report/competitive-analysis';
import type {
    IssueGroupFact,
    ProjectReportBundle,
    ProjectReportDeepAnalysis,
    RankKeywordDetailFact,
    RankTrendPoint,
    SeoRollupFacts,
} from '@/lib/project-report/types';
import { buildGeoDeepAnalysis, mapGeoPagesDeep } from '@/lib/project-report/geo-deep-analysis';

const MAX_KEYWORD_DETAILS = 20;
const MAX_POSITION_POINTS = 90;
const MAX_ISSUE_GROUPS = 20;
function extractSeoRollup(
    aggregated: Record<string, unknown> | null | undefined
): SeoRollupFacts | null {
    if (!aggregated) return null;
    const seo = aggregated.seo as Record<string, unknown> | undefined;
    const links = aggregated.links as Record<string, unknown> | undefined;
    const generative = aggregated.generative as Record<string, unknown> | undefined;
    if (!seo && !links) return null;
    return {
        pagesMissingTitle: typeof seo?.pagesMissingTitle === 'number' ? seo.pagesMissingTitle : null,
        pagesMissingMeta: typeof seo?.pagesMissingMetaDescription === 'number' ? seo.pagesMissingMetaDescription : null,
        pagesMissingH1: typeof seo?.pagesMissingH1 === 'number' ? seo.pagesMissingH1 : null,
        duplicateTitles: typeof seo?.duplicateTitles === 'number' ? seo.duplicateTitles : null,
        brokenLinksCount: typeof links?.brokenCount === 'number' ? links.brokenCount : null,
        jsonLdPages: typeof generative?.pagesWithJsonLd === 'number' ? generative.pagesWithJsonLd : null,
    };
}

export async function collectDeepProjectReportData(
    facts: Omit<ProjectReportBundle, 'visuals' | 'narrative' | 'deep'>,
    projectUserId: string,
    projectId: string
): Promise<ProjectReportDeepAnalysis> {
    const targetDomain = normalizeProjectDomainHost(facts.project.domain);
    const competitorHosts = (facts.project.competitors ?? [])
        .map((c) => normalizeProjectDomainHost(c))
        .filter((d) => d && d !== targetDomain);

    const [geoQuestionHistory, keywords, geoRuns] = await Promise.all([
        buildProjectGeoQuestionHistory({
            projectUserId,
            projectId,
            targetDomain,
            competitorDomains: competitorHosts,
        }),
        listKeywordsByProject(projectUserId, projectId),
        listGeoEeatRuns(projectUserId, 5, { projectId }),
    ]);

    const latestGeoPayload =
        geoRuns.find((r) => r.status === 'complete' && r.payload)?.payload ?? null;
    const geoPages = mapGeoPagesDeep(latestGeoPayload);
    const geoDeep = buildGeoDeepAnalysis(latestGeoPayload, targetDomain, geoQuestionHistory);

    const keywordIds = keywords.map((k) => k.id);
    const lastPositions = await getLastPositionsByKeywordIds(keywordIds);

    const rankKeywordDetails: RankKeywordDetailFact[] = [];
    for (const kw of keywords.slice(0, MAX_KEYWORD_DETAILS)) {
        const positions = await listPositionsByKeyword(kw.id, projectUserId, MAX_POSITION_POINTS);
        const sorted = [...positions].sort(
            (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime()
        );
        const points: RankTrendPoint[] = sorted.map((p) => ({
            recordedAt: p.recordedAt.toISOString(),
            position: p.position,
        }));
        const last = lastPositions.get(kw.id);
        const prev = sorted.length >= 2 ? sorted[sorted.length - 2]!.position : null;
        const curr = last?.position ?? null;
        const delta =
            curr != null && prev != null ? prev - curr : null;

        rankKeywordDetails.push({
            id: kw.id,
            keyword: kw.keyword,
            position: curr,
            previousPosition: prev,
            positionDelta: delta,
            serpLeaderDomain: last?.serpLeaderDomain ?? null,
            competitorPositions: (last?.competitorPositions as Record<string, number | null>) ?? {},
            points,
            evidenceId: `ev-keyword-detail-${kw.id.slice(0, 8)}`,
        });
    }

    let issueGroups: IssueGroupFact[] = [];
    if (facts.domain?.scanId) {
        const groups = await listIssueGroupsPaged({
            userId: projectUserId,
            domainScanId: facts.domain.scanId,
            limit: MAX_ISSUE_GROUPS,
        });
        issueGroups = groups.data.map((g, i) => ({
            groupKey: g.groupKey,
            title: g.message || g.code,
            type: g.type,
            pageCount: g.pageCount,
            wcagLevel: g.wcagLevel ?? undefined,
            evidenceId: `ev-issue-group-${i}`,
        }));
    }

    let seoRollup: SeoRollupFacts | null = null;
    if (facts.domain?.scanId) {
        const row = await getDomainScanWithProjectId(facts.domain.scanId, projectUserId);
        if (row) {
            const summary = buildDomainSummary(row.result);
            seoRollup = extractSeoRollup(summary.aggregated as Record<string, unknown> | undefined);
        }
    }

    // Fix project counts
    const [domainScansCount, singleScansCount, rankCount] = await Promise.all([
        getDomainScansCount(projectUserId, { projectId }),
        getStandaloneScansCount(projectUserId, { projectId }),
        getKeywordsCountByProject(projectId),
    ]);
    facts.project.counts.domainScans = domainScansCount;
    facts.project.counts.singleScans = singleScansCount;
    facts.project.counts.rankTrackingKeywords = rankCount;

    const metrics = buildMetricInsights(facts);
    const competitiveBenchmark = buildCompetitiveBenchmark(facts);

    if (competitiveBenchmark) {
        for (const insight of competitiveBenchmark.deterministicInsights) {
            facts.provenance.push({
                evidenceId: insight.evidenceId,
                source: 'competitive-benchmark',
                label: insight.title,
            });
        }
    }
    if (geoDeep) {
        for (const ins of geoDeep.deterministicInsights) {
            facts.provenance.push({
                evidenceId: ins.evidenceId,
                source: 'geo-deep',
                label: ins.title,
            });
        }
    }

    return {
        metrics,
        sections: {
            siteQuality: null,
            seoRankings: null,
            geo: null,
            competitive: null,
            journey: null,
        },
        geoQuestionHistory,
        geoPages,
        geoDeep,
        rankKeywordDetails,
        issueGroups,
        seoRollup,
        competitiveBenchmark,
    };
}
