/**
 * SEO On-Page Score
 *
 * Transparent, weighted score from the on-page data we collect:
 * - Meta/tag coverage (title, meta description, H1, canonical), scaled by indexability (no noindex)
 * - Heading structure (single H1, no skipped levels)
 * - Content depth (share of pages that are not "skinny" &lt; 300 words)
 *
 * Formula: 0–100 = coverage (40%) + structure (30%) + content (30%).
 * Coverage includes an indexability factor: (indexableCount/totalPages) so noindex pages reduce the score.
 * No pages → score 0.
 */

import type { AggregatedSeo, AggregatedStructure } from './domain-aggregation';

export interface SeoOnPageScoreInput {
  seo: AggregatedSeo | null;
  structure: AggregatedStructure | null;
}

/** Weight of each pillar (must sum to 100). */
const WEIGHT_COVERAGE = 40;
const WEIGHT_STRUCTURE = 30;
const WEIGHT_CONTENT = 30;

export type SeoOnPageScoreLabel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export interface SeoOnPageScoreResult {
  score: number;
  label: SeoOnPageScoreLabel;
  /** Breakdown for tooltip/UI: 0–100 per pillar. */
  breakdown: {
    coverage: number;
    structure: number;
    content: number;
  };
}

/**
 * Computes a 0–100 SEO on-page score from aggregated SEO and structure data.
 * - coverage: average share of pages with title, meta description, H1, canonical (40%), scaled by indexability (no noindex).
 * - structure: share of pages with good heading structure, i.e. single H1 and no skipped levels (30%).
 * - content: share of pages that are not "skinny" (&lt; 300 words) (30%).
 * If totalPages is 0 or seo is null, returns score 0.
 */
export function computeSeoOnPageScore(input: SeoOnPageScoreInput): SeoOnPageScoreResult {
  const { seo, structure } = input;

  if (!seo || seo.totalPages === 0) {
    return {
      score: 0,
      label: 'critical',
      breakdown: { coverage: 0, structure: 0, content: 0 },
    };
  }

  const totalPages = seo.totalPages;
  const noindexCount = seo.pagesWithNoindex?.length ?? 0;
  const indexableCount = Math.max(0, totalPages - noindexCount);
  const indexabilityRatio = totalPages > 0 ? indexableCount / totalPages : 1;

  // Coverage: average share of pages with title, meta, H1, canonical, scaled by indexability (noindex penalized)
  const baseCoverageRatio =
    (seo.withTitle / totalPages + seo.withMetaDescription / totalPages + seo.withH1 / totalPages + seo.withCanonical / totalPages) / 4;
  const coverageRatio = baseCoverageRatio * indexabilityRatio;
  const coverageScore = Math.round(coverageRatio * WEIGHT_COVERAGE);

  // Structure: pages with good structure / totalPages (use structure.totalPages if available for denominator)
  const structureTotal = structure?.totalPages ?? totalPages;
  const goodStructureCount = structure?.pagesWithGoodStructure?.length ?? 0;
  const structureRatio = structureTotal > 0 ? goodStructureCount / structureTotal : 1;
  const structureScore = structure != null ? Math.round(structureRatio * WEIGHT_STRUCTURE) : WEIGHT_STRUCTURE;

  // Content: share of pages that are NOT skinny
  const skinnyCount = seo.pages?.filter((p) => p.isSkinny).length ?? 0;
  const contentRatio = totalPages > 0 ? 1 - skinnyCount / totalPages : 1;
  const contentScore = Math.round(contentRatio * WEIGHT_CONTENT);

  const score = Math.max(0, Math.min(100, coverageScore + structureScore + contentScore));

  let label: SeoOnPageScoreLabel = 'excellent';
  if (score >= 90) label = 'excellent';
  else if (score >= 70) label = 'good';
  else if (score >= 50) label = 'fair';
  else if (score >= 25) label = 'poor';
  else label = 'critical';

  return {
    score,
    label,
    breakdown: {
      coverage: Math.round(coverageRatio * 100),
      structure: Math.round(structureRatio * 100),
      content: Math.round(contentRatio * 100),
    },
  };
}
