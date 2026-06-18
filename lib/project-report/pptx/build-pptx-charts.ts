/**
 * Map bundle chart visuals (same as PDF) to PPTX chart slides.
 */
import type { BarChartItem, TrendSeries, VisualSpec } from '@/lib/project-report/chart-specs';
import { CHART_SERIES_PALETTE } from '@/lib/chart-series-colors';
import type { ProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import type { ReportSlide, ReportSlideChartSeries } from '@/lib/project-report/pptx/types';

const MAX_BAR_ITEMS = 10;
const MAX_LINE_SERIES = 6;

function pptxHex(color: string): string {
    return color.replace(/^#/, '').toUpperCase();
}

function barItemsToSeries(
    items: BarChartItem[],
    seriesName = 'Score'
): { series: ReportSlideChartSeries[]; colors: string[] } {
    const slice = items.slice(0, MAX_BAR_ITEMS);
    return {
        series: [
            {
                name: seriesName,
                labels: slice.map((item) => item.label.trim()),
                values: slice.map((item) => item.value),
            },
        ],
        colors: slice.map((item) => pptxHex(item.color)),
    };
}

function chartSlide(
    partial: Omit<Extract<ReportSlide, { kind: 'chart' }>, 'kind' | 'layout'>
): Extract<ReportSlide, { kind: 'chart' }> {
    return { kind: 'chart', layout: 'CONTENT', ...partial };
}

function visualToChartSlide(
    visual: VisualSpec,
    labels: ProjectReportPdfLabels,
    footer: string,
    locale: 'de' | 'en'
): Extract<ReportSlide, { kind: 'chart' }> | null {
    switch (visual.kind) {
        case 'scoreCards': {
            const items = visual.items.filter((item) => item.value != null);
            if (items.length === 0) return null;
            const { series, colors } = barItemsToSeries(
                items.map((item, i) => ({
                    label: item.label,
                    value: item.value ?? 0,
                    color: item.color || CHART_SERIES_PALETTE[i % CHART_SERIES_PALETTE.length],
                })),
                labels.metricsOverview
            );
            return chartSlide({
                title: labels.metricsOverview,
                chartType: 'bar',
                series,
                colors,
                footer,
                valAxisTitle: locale === 'de' ? 'Score (0–100)' : 'Score (0–100)',
                showValue: true,
            });
        }
        case 'competitorBarChart': {
            const { series, colors } = barItemsToSeries(visual.items, labels.domainScore);
            return chartSlide({
                title: visual.title || labels.competitorComparison,
                chartType: 'bar',
                series,
                colors,
                footer,
                valAxisTitle: labels.domainScore,
                showValue: true,
            });
        }
        case 'competitorSeoBarChart': {
            const { series, colors } = barItemsToSeries(visual.items, 'SEO');
            return chartSlide({
                title: visual.title || labels.seoOnPageSection,
                chartType: 'bar',
                series,
                colors,
                footer,
                valAxisTitle: labels.seoOnPageLabel,
                showValue: true,
            });
        }
        case 'competitorRankingScores': {
            const { series, colors } = barItemsToSeries(visual.items, labels.rankingScore);
            return chartSlide({
                title: labels.rankingCompetitorComparison,
                chartType: 'bar',
                series,
                colors,
                footer,
                valAxisTitle: labels.rankingScore,
                showValue: true,
            });
        }
        case 'rankingKeywords': {
            const items = visual.items
                .filter((item) => item.position != null && item.position > 0)
                .slice(0, MAX_BAR_ITEMS);
            if (items.length === 0) return null;
            return chartSlide({
                title: labels.serpKeywordRankings,
                subtitle: locale === 'de' ? 'Google-Position je Keyword (niedriger = besser)' : 'Google position per keyword (lower = better)',
                chartType: 'barHorizontal',
                series: [
                    {
                        name: labels.keywords,
                        labels: items.map((item) => item.keyword.trim()),
                        values: items.map((item) => item.position ?? 0),
                    },
                ],
                colors: [pptxHex(CHART_SERIES_PALETTE[1])],
                footer,
                valAxisTitle: locale === 'de' ? 'Position' : 'Position',
                showValue: true,
            });
        }
        case 'pageTopics': {
            const items = visual.items.slice(0, 8);
            if (items.length === 0) return null;
            return chartSlide({
                title: labels.contentTopics,
                chartType: 'barHorizontal',
                series: [
                    {
                        name: labels.contentTopics,
                        labels: items.map((item) => item.theme.trim()),
                        values: items.map((item) => item.score),
                    },
                ],
                colors: [pptxHex(CHART_SERIES_PALETTE[4])],
                footer,
                valAxisTitle: locale === 'de' ? 'Themen-Score' : 'Topic score',
                showValue: true,
            });
        }
        case 'geoCompetitive': {
            const { series, colors } = barItemsToSeries(visual.items, 'GEO');
            return chartSlide({
                title: labels.geoEeat,
                chartType: 'bar',
                series,
                colors,
                footer,
                valAxisTitle: 'GEO',
                showValue: true,
            });
        }
        case 'geoModelVisibility': {
            const { series, colors } = barItemsToSeries(visual.items, labels.geoModel);
            return chartSlide({
                title: labels.geoModelBenchmark,
                chartType: 'bar',
                series,
                colors,
                footer,
                valAxisTitle: labels.geoScore,
                showValue: true,
            });
        }
        case 'competitorTopicOverlap': {
            const rows = visual.rows.slice(0, 8);
            if (rows.length === 0) return null;
            const labelsAxis = rows.map((row) => row.theme.trim());
            return chartSlide({
                title: labels.competitiveBenchmark,
                chartType: 'bar',
                series: [
                    {
                        name: locale === 'de' ? 'Eigene Domain' : 'Own domain',
                        labels: labelsAxis,
                        values: rows.map((row) => row.ownScore),
                    },
                    {
                        name: locale === 'de' ? 'Bester Wettbewerber' : 'Best competitor',
                        labels: labelsAxis,
                        values: rows.map((row) => row.bestCompetitorScore),
                    },
                ],
                colors: [pptxHex(CHART_SERIES_PALETTE[0]), pptxHex(CHART_SERIES_PALETTE[3])],
                footer,
                showLegend: true,
                showValue: true,
            });
        }
        case 'rankTrend': {
            const seriesList = visual.series.slice(0, MAX_LINE_SERIES).filter((s) => s.points.length >= 2);
            if (seriesList.length === 0) return null;
            const labelsAxis = seriesList[0]!.points.map((p) => p.label.slice(5));
            const series: ReportSlideChartSeries[] = seriesList.map((s: TrendSeries) => ({
                name: s.keyword.trim(),
                labels: labelsAxis,
                values: s.points.map((p) => p.y),
            }));
            return chartSlide({
                title: labels.rankTrends,
                subtitle: locale === 'de' ? 'SERP-Position über Zeit (niedriger = besser)' : 'SERP position over time (lower = better)',
                chartType: 'line',
                series,
                colors: seriesList.map((s) => pptxHex(s.color)),
                footer,
                showLegend: true,
                valAxisTitle: locale === 'de' ? 'Position' : 'Position',
            });
        }
        default:
            return null;
    }
}

export function chartSlideFromVisual(
    visual: VisualSpec,
    labels: ProjectReportPdfLabels,
    footer: string,
    locale: 'de' | 'en'
): Extract<ReportSlide, { kind: 'chart' }> | null {
    return visualToChartSlide(visual, labels, footer, locale);
}

const EXECUTIVE_CHART_KINDS = new Set<VisualSpec['kind']>([
    'scoreCards',
    'competitorBarChart',
    'rankingKeywords',
    'competitorRankingScores',
]);

const COMPREHENSIVE_CHART_KINDS = new Set<VisualSpec['kind']>([
    ...EXECUTIVE_CHART_KINDS,
    'rankTrend',
    'pageTopics',
    'geoCompetitive',
    'competitorSeoBarChart',
    'competitorTopicOverlap',
    'geoModelVisibility',
]);

export function buildChartSlidesFromVisuals(
    visuals: VisualSpec[],
    labels: ProjectReportPdfLabels,
    footer: string,
    locale: 'de' | 'en',
    comprehensive: boolean
): Extract<ReportSlide, { kind: 'chart' }>[] {
    const allowed = comprehensive ? COMPREHENSIVE_CHART_KINDS : EXECUTIVE_CHART_KINDS;
    const slides: Extract<ReportSlide, { kind: 'chart' }>[] = [];
    const seen = new Set<VisualSpec['kind']>();

    for (const visual of visuals) {
        if (!allowed.has(visual.kind) || seen.has(visual.kind)) continue;
        const slide = visualToChartSlide(visual, labels, footer, locale);
        if (!slide) continue;
        seen.add(visual.kind);
        slides.push(slide);
    }

    return slides;
}

export function buildPersonaRadarSlide(
    personaName: string,
    pillars: Array<{ pillar: string; score: number | null }>,
    footer: string,
    locale: 'de' | 'en',
    options?: { subtitle?: string; bullets?: string[] }
): Extract<ReportSlide, { kind: 'chart' }> | null {
    const values = pillars.slice(0, 6).map((p) => p.score ?? 0);
    if (values.every((v) => v === 0)) return null;
    const defaultSubtitle =
        locale === 'de' ? 'Passung nach Säule (Persona-Sicht)' : 'Fit by pillar (persona view)';
    return chartSlide({
        title: personaName,
        subtitle: options?.subtitle ?? defaultSubtitle,
        chartType: 'radar',
        series: [
            {
                name: personaName,
                labels: pillars.slice(0, 6).map((p) => p.pillar.toUpperCase()),
                values,
            },
        ],
        colors: [pptxHex(CHART_SERIES_PALETTE[0])],
        footer,
        bullets: options?.bullets,
        showLegend: false,
        showValue: true,
    });
}

export function findVisual<T extends VisualSpec['kind']>(
    visuals: VisualSpec[],
    kind: T
): Extract<VisualSpec, { kind: T }> | undefined {
    const found = visuals.find((v) => v.kind === kind);
    return found as Extract<VisualSpec, { kind: T }> | undefined;
}
