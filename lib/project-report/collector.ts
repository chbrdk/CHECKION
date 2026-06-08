/**
 * Collects all project-scoped facts for the executive report bundle.
 */

import { getProject } from '@/lib/db/projects';
import { listKeywordsByProject } from '@/lib/db/rank-tracking-keywords';
import { getLastPositionsByKeywordIds, listPositionsByKeyword } from '@/lib/db/rank-tracking-positions';
import { listGeoEeatRuns } from '@/lib/db/geo-eeat-runs';
import { listJourneyRuns } from '@/lib/db/journey-runs';
import { buildProjectRankingSummary, positionToPoints } from '@/lib/project-summaries/ranking-summary';
import {
    buildProjectGeoSummary,
    normalizeGeoDomain,
    scoreFromGeoMetrics,
} from '@/lib/project-summaries/geo-summary';
import { buildProjectDomainSummaryAll } from '@/lib/project-summaries/domain-summary-all';
import type { CompetitiveBenchmarkResult, CompetitiveMetrics } from '@/lib/types';
import {
    pathProject,
    pathProjectRankings,
    pathDomain,
    pathGeoEeat,
} from '@/lib/constants';
import type {
    CollectProjectReportOptions,
    CompetitorFacts,
    DomainEcoFacts,
    DomainFacts,
    DomainPerformanceFacts,
    FreshnessMeta,
    GeoFacts,
    GeoCompetitiveDomainFact,
    ProjectFacts,
    ProjectReportBundle,
    ProvenanceEntry,
    RankingFacts,
    RankingKeywordFact,
    RankTrendSeries,
    JourneySummaryFact,
} from '@/lib/project-report/types';

const MAX_SYSTEMIC_ISSUES = 8;
const MAX_GEO_RECOMMENDATIONS = 6;
const MAX_TOP_KEYWORDS = 10;

function slugDomain(domain: string): string {
    return normalizeGeoDomain(domain).replace(/[^a-z0-9]+/g, '-');
}

export async function collectProjectReportFacts(
    projectId: string,
    viewerUserId: string,
    options: CollectProjectReportOptions
): Promise<Omit<ProjectReportBundle, 'visuals' | 'narrative'>> {
    const project = await getProject(projectId, viewerUserId);
    if (!project) {
        throw new Error('Project not found');
    }
    const projectUserId = project.userId;
    const provenance: ProvenanceEntry[] = [];

    const register = (
        evidenceId: string,
        source: string,
        label: string,
        value?: string | number | null
    ) => {
        provenance.push({ evidenceId, source, label, value });
    };

    const [domainAll, rankingSummary, geoSummary, keywords, journeyRuns, geoRuns] = await Promise.all([
        buildProjectDomainSummaryAll(projectUserId, projectId),
        buildProjectRankingSummary(projectUserId, projectId),
        buildProjectGeoSummary(
            projectUserId,
            projectId,
            project.domain ?? '',
            (project.competitors ?? [])
                .filter((c): c is string => typeof c === 'string' && c.trim() !== '')
                .map((c) => normalizeGeoDomain(c.trim().startsWith('http') ? c.trim() : `https://${c.trim()}`))
                .filter((d) => d !== normalizeGeoDomain(project.domain ?? ''))
        ),
        listKeywordsByProject(projectUserId, projectId),
        listJourneyRuns(projectUserId, 5, { projectId }),
        listGeoEeatRuns(projectUserId, 1, { projectId }),
    ]);

    const projectFacts: ProjectFacts = {
        id: project.id,
        name: project.name,
        domain: project.domain,
        industry: project.industry,
        valueProposition: project.valueProposition,
        tags: project.tags ?? [],
        competitors: project.competitors ?? [],
        counts: {
            domainScans: 0,
            journeyRuns: journeyRuns.length,
            geoEeatRuns: geoRuns.length,
            singleScans: 0,
            rankTrackingKeywords: keywords.length,
        },
    };

    let domainFacts: DomainFacts | null = null;
    if (domainAll.own) {
        const own = domainAll.own;
        const perf = own.aggregated.performance;
        const eco = own.aggregated.eco;
        const performanceFacts: DomainPerformanceFacts | null = perf
            ? {
                  avgTtfb: perf.avgTtfb ?? null,
                  avgFcp: perf.avgFcp ?? null,
                  avgLcp: perf.avgLcp ?? null,
              }
            : null;
        const ecoFacts: DomainEcoFacts | null = eco
            ? {
                  avgCo2: eco.avgCo2 ?? null,
                  gradeDistribution: eco.gradeDistribution ?? {},
              }
            : null;

        const wcagEv = 'ev-wcag-score';
        const seoEv = 'ev-seo-score';
        const domainEv = 'ev-domain-score';
        register(wcagEv, 'domain-scan', 'WCAG Score', own.wcagScore);
        register(seoEv, 'domain-scan', 'SEO On-Page Score', own.seoOnPageScore);
        register(domainEv, 'domain-scan', 'Domain Score', own.score);
        register('ev-wcag-errors', 'domain-scan', 'WCAG Errors', own.issueStats.errors);
        register('ev-wcag-warnings', 'domain-scan', 'WCAG Warnings', own.issueStats.warnings);

        domainFacts = {
            scanId: own.scanId,
            domain: own.domain,
            score: own.score,
            wcagScore: own.wcagScore,
            seoOnPageScore: own.seoOnPageScore,
            seoOnPageLabel: own.seoOnPageLabel,
            totalPageCount: own.totalPageCount,
            scannedAt: own.scannedAt,
            issueStats: own.issueStats,
            performance: performanceFacts,
            eco: ecoFacts,
            pageClassification: own.aggregated.pageClassification,
            systemicIssues: own.systemicIssues.slice(0, MAX_SYSTEMIC_ISSUES).map((issue, i) => {
                const ev = `ev-systemic-${i}`;
                register(ev, 'domain-scan', issue.title, issue.count);
                return {
                    issueId: issue.issueId,
                    title: issue.title,
                    count: issue.count,
                    evidenceId: ev,
                };
            }),
            llmSummary: own.llmSummary,
            evidenceIds: { wcagScore: wcagEv, seoScore: seoEv, domainScore: domainEv },
        };
    }

    const competitors: CompetitorFacts[] = [];
    for (const [domain, comp] of Object.entries(domainAll.competitors)) {
        const slug = slugDomain(domain);
        const wcagEv = `ev-competitor-wcag-${slug}`;
        const seoEv = `ev-competitor-seo-${slug}`;
        const domainEv = `ev-competitor-domain-${slug}`;
        if (!comp) {
            competitors.push({
                domain,
                scanId: null,
                status: 'missing',
                score: 0,
                wcagScore: 0,
                seoOnPageScore: 0,
                seoOnPageLabel: 'critical',
                totalPageCount: 0,
                pageClassification: null,
                issueStats: { errors: 0, warnings: 0, notices: 0 },
                performance: null,
                eco: null,
                systemicIssues: [],
                llmSummary: null,
                evidenceIds: { wcagScore: wcagEv, seoScore: seoEv, domainScore: domainEv },
                evidenceId: wcagEv,
            });
            continue;
        }
        register(wcagEv, 'competitor-scan', `${domain} WCAG`, comp.wcagScore);
        register(seoEv, 'competitor-scan', `${domain} SEO`, comp.seoOnPageScore);
        register(domainEv, 'competitor-scan', `${domain} Domain Score`, comp.score);
        const perf = comp.aggregated.performance;
        const ecoAgg = comp.aggregated.eco;
        competitors.push({
            domain,
            scanId: comp.scanId,
            status: comp.status,
            score: comp.score,
            wcagScore: comp.wcagScore,
            seoOnPageScore: comp.seoOnPageScore,
            seoOnPageLabel: comp.seoOnPageLabel,
            totalPageCount: comp.totalPageCount,
            pageClassification: comp.aggregated.pageClassification,
            issueStats: comp.issueStats,
            performance: perf
                ? {
                      avgTtfb: perf.avgTtfb ?? null,
                      avgFcp: perf.avgFcp ?? null,
                      avgLcp: perf.avgLcp ?? null,
                  }
                : null,
            eco: ecoAgg
                ? {
                      avgCo2: ecoAgg.avgCo2 ?? null,
                      gradeDistribution: ecoAgg.gradeDistribution ?? {},
                  }
                : null,
            systemicIssues: comp.systemicIssues.slice(0, 5).map((issue, i) => ({
                issueId: issue.issueId,
                title: issue.title,
                count: issue.count,
                evidenceId: `ev-competitor-issue-${slug}-${i}`,
            })),
            llmSummary: comp.llmSummary,
            evidenceIds: { wcagScore: wcagEv, seoScore: seoEv, domainScore: domainEv },
            evidenceId: wcagEv,
        });
    }

    let rankings: RankingFacts | null = null;
    if (keywords.length > 0) {
        const rankingEv = 'ev-ranking-score';
        register(rankingEv, 'rank-tracking', 'Ranking Score', rankingSummary.score);

        const keywordIds = keywords.map((k) => k.id);
        const lastPositions = await getLastPositionsByKeywordIds(keywordIds);
        const topKeywords: RankingKeywordFact[] = keywords
            .map((k) => {
                const pos = lastPositions.get(k.id);
                return {
                    id: k.id,
                    keyword: k.keyword,
                    position: pos?.position ?? null,
                    points: positionToPoints(pos?.position ?? null),
                    evidenceId: `ev-keyword-${k.id.slice(0, 8)}`,
                };
            })
            .sort((a, b) => b.points - a.points)
            .slice(0, MAX_TOP_KEYWORDS)
            .map(({ id, keyword, position, evidenceId }) => {
                register(evidenceId, 'rank-tracking', keyword, position);
                return { id, keyword, position, evidenceId };
            });

        rankings = {
            score: rankingSummary.score,
            keywordCount: rankingSummary.keywordCount,
            lastUpdated: rankingSummary.lastUpdated,
            competitorScores: rankingSummary.competitorScores,
            topKeywords,
            evidenceId: rankingEv,
        };
    }

    let geo: GeoFacts | null = null;
    const latestGeo = geoSummary.latestComplete;
    if (latestGeo?.payload || geoSummary.score != null) {
        const geoEv = 'ev-geo-score';
        register(geoEv, 'geo-eeat', 'GEO Score', geoSummary.score);

        const recommendations = (latestGeo?.payload?.recommendations ?? [])
            .slice(0, MAX_GEO_RECOMMENDATIONS)
            .map((r, i) => ({
                title: r.title || r.dimension || `Recommendation ${i + 1}`,
                description: r.description ?? '',
                priority: r.priority,
            }));

        const competitiveDomains: GeoCompetitiveDomainFact[] = [];
        const payload = latestGeo?.payload ?? null;
        if (payload) {
            const byModel =
                payload.competitiveByModel ??
                (payload.competitive ? { default: payload.competitive } : null);
            if (byModel) {
                const allDomains = new Set<string>();
                if (project.domain) allDomains.add(normalizeGeoDomain(project.domain));
                for (const c of project.competitors ?? []) {
                    if (typeof c === 'string') allDomains.add(normalizeGeoDomain(c));
                }
                for (const domain of allDomains) {
                    const scores: number[] = [];
                    let shareOfVoice: number | null = null;
                    let avgPosition: number | null = null;
                    for (const result of Object.values(byModel) as CompetitiveBenchmarkResult[]) {
                        if (!result?.metrics) continue;
                        const m = result.metrics.find(
                            (x: CompetitiveMetrics) => normalizeGeoDomain(x.domain) === domain
                        );
                        const s = scoreFromGeoMetrics(m);
                        if (s != null) scores.push(s);
                        if (m) {
                            shareOfVoice = m.shareOfVoice ?? shareOfVoice;
                            avgPosition = m.avgPosition ?? avgPosition;
                        }
                    }
                    const ev = `ev-geo-comp-${slugDomain(domain)}`;
                    const score =
                        scores.length > 0
                            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                            : null;
                    register(ev, 'geo-competitive', domain, score);
                    competitiveDomains.push({
                        domain,
                        shareOfVoice,
                        avgPosition,
                        score,
                        evidenceId: ev,
                    });
                }
            }
        }

        geo = {
            score: geoSummary.score,
            runId: latestGeo?.id ?? null,
            runUrl: latestGeo?.url ?? null,
            runCreatedAt: latestGeo?.createdAt ?? null,
            status: latestGeo?.status ?? null,
            recommendations,
            competitiveDomains: competitiveDomains.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
            competitorScores: geoSummary.competitorScores,
            evidenceId: geoEv,
        };
    }

    const rankTrends: RankTrendSeries[] = [];
    for (const kw of keywords.slice(0, 5)) {
        const positions = await listPositionsByKeyword(kw.id, projectUserId, 12);
        if (positions.length >= 2) {
            rankTrends.push({
                keywordId: kw.id,
                keyword: kw.keyword,
                points: positions.map((p) => ({
                    recordedAt: p.recordedAt.toISOString(),
                    position: p.position,
                })),
            });
        }
    }

    let journey: JourneySummaryFact | null = null;
    const latestJourney = journeyRuns.find((r) => r.status === 'complete');
    if (latestJourney) {
        const result = latestJourney.result as { steps?: unknown[]; summary?: string } | null;
        journey = {
            runId: latestJourney.id,
            url: latestJourney.url,
            task: latestJourney.task,
            status: latestJourney.status,
            createdAt: latestJourney.createdAt.toISOString(),
            stepCount: Array.isArray(result?.steps) ? result!.steps!.length : null,
            summary: typeof result?.summary === 'string' ? result.summary : null,
        };
    }

    const freshness: FreshnessMeta = {
        sources: [
            {
                key: 'domain-scan',
                label: 'Deep Scan',
                updatedAt: domainFacts?.scannedAt ?? null,
                available: domainFacts != null,
            },
            {
                key: 'rankings',
                label: 'Rank Tracking',
                updatedAt: rankings?.lastUpdated ?? null,
                available: rankings != null,
            },
            {
                key: 'geo',
                label: 'GEO / E-E-A-T',
                updatedAt: geo?.runCreatedAt ?? null,
                available: geo != null,
            },
        ],
    };

    return {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        locale: options.locale,
        variant: options.variant,
        project: projectFacts,
        domain: domainFacts,
        competitors,
        rankings,
        geo,
        rankTrends,
        journey,
        deep: null,
        provenance,
        freshness,
        links: {
            projectPath: pathProject(projectId),
            domainScanPath: domainFacts ? pathDomain(domainFacts.scanId) : null,
            geoRunPath: geo?.runId ? pathGeoEeat(geo.runId) : null,
            rankingsPath: pathProjectRankings(projectId),
        },
    };
}
