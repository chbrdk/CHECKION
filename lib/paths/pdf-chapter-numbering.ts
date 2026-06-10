/**
 * Hierarchical chapter numbering for project report PDFs (headings + TOC).
 */
import { buildEchonMarketPdfContent } from '@/lib/project-report/pdf-echon-display';
import { filterIssueGroupsForPdfAppendix } from '@/lib/project-report/pdf-issue-groups-display';
import { PDF_KPI_EXCLUDED_METRIC_IDS } from '@/lib/project-report/pdf-metrics-display';
import type { ProjectReportBundle } from '@/lib/project-report/types';
import type { ProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';

export type PdfOutlineEntry = {
    id: string;
    pageKey: string;
    title: string;
    level: 0 | 1;
};

export function formatNumberedTitle(number: string | undefined, title: string): string {
    return number ? `${number} ${title}` : title;
}

/** Assigns 1, 2, 3 … and 2.1, 2.2 … based on outline order. */
export function assignOutlineNumbers(entries: PdfOutlineEntry[]): Map<string, string> {
    let chapter = 0;
    let subChapter = 0;
    const numbers = new Map<string, string>();

    for (const entry of entries) {
        if (entry.level === 0) {
            chapter += 1;
            subChapter = 0;
            numbers.set(entry.id, String(chapter));
        } else {
            subChapter += 1;
            numbers.set(entry.id, `${chapter}.${subChapter}`);
        }
    }

    return numbers;
}

function hasAudience(bundle: ProjectReportBundle): boolean {
    return bundle.audience?.available === true && (bundle.audience.personas.length ?? 0) > 0;
}

function hasMarketSignals(bundle: ProjectReportBundle): boolean {
    return buildEchonMarketPdfContent(bundle.marketContext, {
        executiveSummaryNarrative: bundle.narrative?.executiveSummary,
    }).show;
}

function isComprehensive(bundle: ProjectReportBundle): boolean {
    return bundle.variant === 'comprehensive' || bundle.variant === 'full';
}

/** Ordered outline — drives TOC rows and section header numbers. */
export function buildProjectReportOutline(
    bundle: ProjectReportBundle,
    labels: ProjectReportPdfLabels
): PdfOutlineEntry[] {
    const outline: PdfOutlineEntry[] = [];
    const narrative = bundle.narrative;
    const domain = bundle.domain;
    const rankings = bundle.rankings;
    const geo = bundle.geo;
    const geoDeep = bundle.deep?.geoDeep;
    const deep = bundle.deep;
    const comprehensive = isComprehensive(bundle) && deep;

    const push = (entry: PdfOutlineEntry) => outline.push(entry);

    push({ id: 'executive', pageKey: 'executive', title: labels.executiveSummary, level: 0 });
    if (narrative?.competitiveLandscape) {
        push({
            id: 'executive.competitors',
            pageKey: 'executive',
            title: labels.competitorComparison,
            level: 1,
        });
    }
    if (domain?.llmSummary?.summary) {
        push({
            id: 'executive.domain-summary',
            pageKey: 'executive',
            title: 'Domain Summary',
            level: 1,
        });
    }

    if (hasMarketSignals(bundle)) {
        push({ id: 'market', pageKey: 'market', title: labels.marketSignals, level: 0 });
    }

    push({ id: 'quality', pageKey: 'quality', title: labels.siteQuality, level: 0 });
    if ((domain?.systemicIssues.length ?? 0) > 0) {
        push({
            id: 'quality.systemic-issues',
            pageKey: 'quality',
            title: labels.systemicIssues,
            level: 1,
        });
    }

    push({ id: 'seo', pageKey: 'seo', title: labels.seoRankings, level: 0 });
    if (domain) {
        push({ id: 'seo.on-page', pageKey: 'seo', title: labels.seoOnPageSection, level: 1 });
    }
    if (rankings) {
        push({
            id: 'seo.serp-rankings',
            pageKey: 'seo',
            title: labels.serpKeywordRankings,
            level: 1,
        });
        if (bundle.visuals.some((v) => v.kind === 'rankTrend')) {
            push({ id: 'seo.rank-trends', pageKey: 'seo', title: labels.rankTrends, level: 1 });
        }
    }

    push({ id: 'geo', pageKey: 'geo', title: labels.geoEeat, level: 0 });
    if (bundle.visuals.some((v) => v.kind === 'geoModelVisibility')) {
        push({
            id: 'geo.model-benchmark',
            pageKey: 'geo',
            title: labels.geoModelBenchmark,
            level: 1,
        });
    }
    if (bundle.visuals.some((v) => v.kind === 'geoCompetitive')) {
        push({
            id: 'geo.competitive',
            pageKey: 'geo',
            title: labels.competitorComparison,
            level: 1,
        });
    }
    if (geoDeep && geoDeep.deterministicInsights.length > 0) {
        push({ id: 'geo.insights', pageKey: 'geo', title: labels.geoInsights, level: 1 });
    }
    if ((geo?.recommendations.length ?? 0) > 0) {
        push({ id: 'geo.recommendations', pageKey: 'geo', title: labels.recommendations, level: 1 });
    }

    push({ id: 'topics', pageKey: 'topics', title: labels.contentTopics, level: 0 });
    push({
        id: 'topics.competitors',
        pageKey: 'topics',
        title: labels.competitorComparison,
        level: 1,
    });

    if (hasAudience(bundle)) {
        push({ id: 'audience', pageKey: 'audience-intro', title: labels.audienceReality, level: 0 });
        push({
            id: 'audience.personas',
            pageKey: 'audience-personas',
            title: labels.audiencePersonas,
            level: 1,
        });
    }

    if ((narrative?.findings.length ?? 0) > 0) {
        push({ id: 'findings', pageKey: 'findings', title: labels.keyFindings, level: 0 });
    }

    push({ id: 'actions', pageKey: 'actions', title: labels.actionPlan, level: 0 });
    if (bundle.journey) {
        push({
            id: 'actions.journey',
            pageKey: 'actions',
            title: labels.journeySummary,
            level: 1,
        });
    }

    if (comprehensive) {
        if (deep.metrics.some((m) => !PDF_KPI_EXCLUDED_METRIC_IDS.has(m.id))) {
            push({
                id: 'deep.metrics',
                pageKey: 'deep-metrics',
                title: labels.metricsOverview,
                level: 0,
            });
        }

        const benchmark = deep.competitiveBenchmark;
        if (benchmark && benchmark.scoreboard.length > 0) {
            push({
                id: 'deep.competitive',
                pageKey: 'deep-competitive',
                title: labels.competitiveBenchmark,
                level: 0,
            });
            push({
                id: 'deep.competitive.scoreboard',
                pageKey: 'deep-competitive',
                title: labels.scoreboard,
                level: 1,
            });
            if (benchmark.deterministicInsights.length > 0) {
                push({
                    id: 'deep.competitive.insights',
                    pageKey: 'deep-competitive',
                    title: labels.competitiveInsights,
                    level: 1,
                });
            }
            if (benchmark.topicOverlap.length > 0) {
                push({
                    id: 'deep.competitive.topics',
                    pageKey: 'deep-competitive',
                    title: labels.topicOverlap,
                    level: 1,
                });
            }
        }

        if (bundle.visuals.some((v) => v.kind === 'competitorRankingScores')) {
            push({
                id: 'deep.ranking-competitors',
                pageKey: 'deep-ranking-competitors',
                title: labels.rankingCompetitorComparison,
                level: 0,
            });
        }

        const geoPages = geoDeep?.pages.length ? geoDeep.pages : deep.geoPages;
        if (geoPages.length > 0) {
            push({
                id: 'deep.geo-pages',
                pageKey: 'deep-geo-pages',
                title: labels.geoOnPageEeat,
                level: 0,
            });
        }

        const appendixIssueGroups = filterIssueGroupsForPdfAppendix(
            deep.issueGroups,
            bundle.domain?.systemicIssues.map((issue) => issue.title) ?? []
        );
        if (appendixIssueGroups.length > 0 || deep.seoRollup) {
            push({
                id: 'deep.issues-seo',
                pageKey: 'deep-issues-seo',
                title: labels.technicalAppendix,
                level: 0,
            });
            if (appendixIssueGroups.length > 0) {
                push({
                    id: 'deep.issues-seo.groups',
                    pageKey: 'deep-issues-seo',
                    title: labels.issueGroups,
                    level: 1,
                });
            }
            if (deep.seoRollup) {
                push({
                    id: 'deep.issues-seo.technical',
                    pageKey: 'deep-issues-seo',
                    title: labels.seoTechnical,
                    level: 1,
                });
            }
        }
    }

    return outline;
}
