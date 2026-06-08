/**
 * Chart data specs for project report PDF (no images — rendered via @react-pdf Svg).
 */

import type {
    CompetitorFacts,
    DomainFacts,
    GeoFacts,
    ProjectReportBundle,
    ProjectReportDeepAnalysis,
    RankingFacts,
} from '@/lib/project-report/types';
import { CHART_SERIES_PALETTE } from '@/lib/chart-series-colors';

export type VisualSpecKind =
    | 'scoreCards'
    | 'competitorBarChart'
    | 'rankingKeywords'
    | 'geoCompetitive'
    | 'pageTopics'
    | 'rankTrend'
    | 'geoQuestionTrend'
    | 'competitorRankingScores'
    | 'competitorSeoBarChart'
    | 'competitorTopicOverlap';

export interface ScoreCardItem {
    label: string;
    value: number | null;
    max?: number;
    color: string;
}

export interface BarChartItem {
    label: string;
    value: number;
    color: string;
    isHighlight?: boolean;
}

export interface KeywordBarItem {
    keyword: string;
    position: number | null;
    barWidth: number;
}

export interface TopicBarItem {
    theme: string;
    score: number;
    pageCount: number;
}

export interface TrendPoint {
    x: number;
    y: number;
    label: string;
}

export interface TrendSeries {
    keyword: string;
    color: string;
    points: TrendPoint[];
}

export type VisualSpec =
    | { kind: 'scoreCards'; items: ScoreCardItem[] }
    | { kind: 'competitorBarChart'; title: string; items: BarChartItem[] }
    | { kind: 'rankingKeywords'; items: KeywordBarItem[] }
    | { kind: 'geoCompetitive'; items: BarChartItem[] }
    | { kind: 'pageTopics'; items: TopicBarItem[] }
    | { kind: 'rankTrend'; series: TrendSeries[] }
    | { kind: 'geoQuestionTrend'; items: BarChartItem[] }
    | { kind: 'competitorRankingScores'; items: BarChartItem[] }
    | { kind: 'competitorSeoBarChart'; title: string; items: BarChartItem[] }
    | {
          kind: 'competitorTopicOverlap';
          rows: Array<{ theme: string; ownScore: number; bestCompetitorScore: number; bestCompetitor: string }>;
      };

const MAX_KEYWORDS = 10;
const MAX_TOPICS = 5;
const MAX_COMPETITORS = 8;

export function buildChartSpecs(
    domain: DomainFacts | null,
    competitors: CompetitorFacts[],
    rankings: RankingFacts | null,
    geo: GeoFacts | null,
    projectDomain: string | null,
    rankTrends?: ProjectReportBundle['rankTrends'],
    deep?: ProjectReportDeepAnalysis | null
): VisualSpec[] {
    const specs: VisualSpec[] = [];

    specs.push({
        kind: 'scoreCards',
        items: [
            {
                label: 'WCAG',
                value: domain?.wcagScore ?? null,
                color: CHART_SERIES_PALETTE[0],
            },
            {
                label: 'SEO',
                value: domain?.seoOnPageScore ?? null,
                color: CHART_SERIES_PALETTE[4],
            },
            {
                label: 'GEO',
                value: geo?.score ?? null,
                color: CHART_SERIES_PALETTE[2],
            },
            {
                label: 'Rankings',
                value: rankings?.score ?? null,
                color: CHART_SERIES_PALETTE[1],
            },
        ],
    });

    const competitorBars: BarChartItem[] = [];
    if (domain) {
        competitorBars.push({
            label: projectDomain ?? 'Own',
            value: domain.wcagScore,
            color: CHART_SERIES_PALETTE[0],
            isHighlight: true,
        });
    }
    for (const [i, c] of competitors.slice(0, MAX_COMPETITORS).entries()) {
        if (c.status !== 'complete') continue;
        competitorBars.push({
            label: c.domain,
            value: c.wcagScore,
            color: CHART_SERIES_PALETTE[(i + 1) % CHART_SERIES_PALETTE.length],
        });
    }
    if (competitorBars.length > 1) {
        specs.push({
            kind: 'competitorBarChart',
            title: 'WCAG Score Comparison',
            items: competitorBars,
        });
    }

    if (rankings && rankings.topKeywords.length > 0) {
        specs.push({
            kind: 'rankingKeywords',
            items: rankings.topKeywords.slice(0, MAX_KEYWORDS).map((k) => ({
                keyword: k.keyword,
                position: k.position,
                barWidth: k.position != null && k.position >= 1 && k.position <= 100
                    ? Math.max(5, 100 - k.position)
                    : 0,
            })),
        });
    }

    if (geo && geo.competitiveDomains.length > 0) {
        specs.push({
            kind: 'geoCompetitive',
            items: geo.competitiveDomains.slice(0, MAX_COMPETITORS).map((d, i) => ({
                label: d.domain,
                value: d.score ?? 0,
                color: CHART_SERIES_PALETTE[i % CHART_SERIES_PALETTE.length],
                isHighlight: i === 0,
            })),
        });
    }

    const themes = domain?.pageClassification?.topThemes ?? [];
    if (themes.length > 0) {
        specs.push({
            kind: 'pageTopics',
            items: themes.slice(0, MAX_TOPICS).map((t) => ({
                theme: t.tag,
                score: t.score ?? 0,
                pageCount: t.pageCount ?? 0,
            })),
        });
    }

    const trendSource =
        rankTrends && rankTrends.length > 0
            ? rankTrends
            : deep?.rankKeywordDetails.map((k) => ({
                  keywordId: k.id,
                  keyword: k.keyword,
                  points: k.points,
              })) ?? [];

    if (trendSource.length > 0) {
        const series: TrendSeries[] = trendSource.slice(0, 8).map((t, i) => ({
            keyword: t.keyword,
            color: CHART_SERIES_PALETTE[i % CHART_SERIES_PALETTE.length],
            points: t.points.slice(-24).map((p, idx) => ({
                x: idx,
                y: p.position != null ? Math.min(100, p.position) : 100,
                label: p.recordedAt.slice(0, 10),
            })),
        }));
        if (series.some((s) => s.points.length >= 2)) {
            specs.push({ kind: 'rankTrend', series });
        }
    }

    if (deep?.geoQuestionHistory && deep.geoQuestionHistory.length > 0) {
        specs.push({
            kind: 'geoQuestionTrend',
            items: deep.geoQuestionHistory.slice(0, 8).map((q, i) => ({
                label: q.queryText.slice(0, 40),
                value: q.latestPosition != null ? Math.max(1, 101 - q.latestPosition) : 0,
                color: CHART_SERIES_PALETTE[i % CHART_SERIES_PALETTE.length],
            })),
        });
    }

    if (deep?.competitiveBenchmark && deep.competitiveBenchmark.scoreboard.length > 1) {
        const seoBars: BarChartItem[] = deep.competitiveBenchmark.scoreboard.map((row, i) => ({
            label: row.isOwn ? (projectDomain ?? 'Own') : row.domain,
            value: row.seoOnPageScore,
            color: CHART_SERIES_PALETTE[row.isOwn ? 0 : (i % CHART_SERIES_PALETTE.length)],
            isHighlight: row.isOwn,
        }));
        specs.push({
            kind: 'competitorSeoBarChart',
            title: 'SEO On-Page — Own vs Competitors',
            items: seoBars,
        });

        const topicRows = deep.competitiveBenchmark.topicOverlap
            .filter((t) => t.own || Object.keys(t.competitors).length > 0)
            .slice(0, 8)
            .map((t) => {
                const compEntries = Object.entries(t.competitors);
                const best = compEntries.sort((a, b) => b[1].score - a[1].score)[0];
                return {
                    theme: t.themeTag,
                    ownScore: t.own?.score ?? 0,
                    bestCompetitorScore: best?.[1].score ?? 0,
                    bestCompetitor: best?.[0] ?? '–',
                };
            });
        if (topicRows.length > 0) {
            specs.push({ kind: 'competitorTopicOverlap', rows: topicRows });
        }
    }

    if (rankings && Object.keys(rankings.competitorScores).length > 0) {
        const items: BarChartItem[] = [];
        if (rankings.score != null) {
            items.push({
                label: projectDomain ?? 'Own',
                value: rankings.score,
                color: CHART_SERIES_PALETTE[0],
                isHighlight: true,
            });
        }
        for (const [domain, score] of Object.entries(rankings.competitorScores).slice(0, MAX_COMPETITORS)) {
            items.push({
                label: domain,
                value: score,
                color: CHART_SERIES_PALETTE[(items.length) % CHART_SERIES_PALETTE.length],
            });
        }
        if (items.length > 1) {
            specs.push({ kind: 'competitorRankingScores', items });
        }
    }

    return specs;
}
