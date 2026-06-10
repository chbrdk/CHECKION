/**
 * GEO PDF display limits.
 */
import type { GeoInsightFact } from '@/lib/project-report/types';

export const PDF_GEO_INSIGHT_CARD_LIMIT = 3;

export function selectGeoInsightsForPdf(
    insights: GeoInsightFact[],
    limit = PDF_GEO_INSIGHT_CARD_LIMIT
): GeoInsightFact[] {
    return insights.slice(0, limit);
}

export const PDF_GEO_DEEP_PAGE_LIMIT = 5;
export const PDF_GEO_DEEP_REASONING_MAX = 160;
