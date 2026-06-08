/**
 * Chart data specs for project report PDF (no images — rendered via @react-pdf Svg).
 */

import type {
    CompetitorFacts,
    DomainFacts,
    GeoFacts,
    ProjectReportBundle,
    RankingFacts,
} from '@/lib/project-report/types';
import { CHART_SERIES_PALETTE } from '@/lib/chart-series-colors';

export type VisualSpecKind =
    | 'scoreCards'
    | 'competitorBarChart'
    | 'rankingKeywords'
    | 'geoCompetitive'
    | 'pageTopics'
    | 'rankTrend';

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
    | { kind: 'rankTrend'; series: TrendSeries[] };

const MAX_KEYWORDS = 10;
const MAX_TOPICS = 5;
const MAX_COMPETITORS = 8;

export function buildChartSpecs(
    domain: DomainFacts | null,
    competitors: CompetitorFacts[],
    rankings: RankingFacts | null,
    geo: GeoFacts | null,
    projectDomain: string | null,
    rankTrends?: ProjectReportBundle['rankTrends']
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

    if (rankTrends && rankTrends.length > 0) {
        const series: TrendSeries[] = rankTrends.slice(0, 5).map((t, i) => ({
            keyword: t.keyword,
            color: CHART_SERIES_PALETTE[i % CHART_SERIES_PALETTE.length],
            points: t.points.slice(-12).map((p, idx) => ({
                x: idx,
                y: p.position != null ? Math.min(100, p.position) : 100,
                label: p.recordedAt.slice(0, 10),
            })),
        }));
        if (series.some((s) => s.points.length >= 2)) {
            specs.push({ kind: 'rankTrend', series });
        }
    }

    return specs;
}
