/**
 * KPI appendix — show supplementary metrics only (not executive scorecards / chapter KPIs).
 */
import type { MetricInsight } from '@/lib/project-report/types';

/** Already shown as executive score rings or main chapter stat grids. */
export const PDF_KPI_EXCLUDED_METRIC_IDS = new Set([
    'domain-score',
    'wcag-errors',
    'seo-onpage',
    'geo-score',
    'ranking-score',
    'keyword-count',
]);

export const PDF_KPI_APPENDIX_LIMIT = 20;

export function filterSupplementaryMetricsForPdf(
    metrics: MetricInsight[],
    limit = PDF_KPI_APPENDIX_LIMIT
): MetricInsight[] {
    return metrics
        .filter((metric) => !PDF_KPI_EXCLUDED_METRIC_IDS.has(metric.id))
        .slice(0, limit);
}

export function hasSupplementaryMetricsForPdf(metrics: MetricInsight[]): boolean {
    return filterSupplementaryMetricsForPdf(metrics).length > 0;
}
