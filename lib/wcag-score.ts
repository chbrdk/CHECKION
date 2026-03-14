/**
 * WCAG Accessibility Score
 *
 * W3C does not define an official "WCAG score" formula. This module implements
 * a severity-weighted, page-normalized score aligned with common tooling:
 * - Lighthouse: weighted audits (axe impact); we approximate via severity.
 * - BrowserStack: P/(P+F)×100 with severity weights (Critical 10, Serious 7, Moderate 3, Minor 1).
 *
 * We map: errors → critical/serious (10), warnings → moderate (3), notices → minor (1).
 * Score = 100 − min(100, weightedIssuesPerPage), so 0 issues → 100, high issues/page → 0.
 */

export interface WcagScoreInput {
  errors: number;
  warnings: number;
  notices: number;
  totalPageCount: number;
}

/** Severity weights (aligned with axe/Lighthouse impact: critical/serious ~10, moderate ~3, minor ~1). */
const WEIGHT_ERROR = 10;
const WEIGHT_WARNING = 3;
const WEIGHT_NOTICE = 1;

/**
 * Computes a 0–100 WCAG accessibility score from issue counts, normalized by page count.
 * @returns Score 0–100 and optional details for tooltips (weighted per page, formula hint).
 */
export function computeWcagScore(input: WcagScoreInput): {
  score: number;
  weightedPerPage: number;
  label: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
} {
  const { errors, warnings, notices, totalPageCount } = input;
  const pages = Math.max(1, totalPageCount);
  const weighted =
    errors * WEIGHT_ERROR + warnings * WEIGHT_WARNING + notices * WEIGHT_NOTICE;
  const weightedPerPage = weighted / pages;
  const score = Math.round(
    Math.max(0, Math.min(100, 100 - Math.min(100, weightedPerPage)))
  );

  let label: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' = 'excellent';
  if (score >= 90) label = 'excellent';
  else if (score >= 70) label = 'good';
  else if (score >= 50) label = 'fair';
  else if (score >= 25) label = 'poor';
  else label = 'critical';

  return { score, weightedPerPage, label };
}
