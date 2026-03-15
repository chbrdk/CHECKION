/**
 * GEO / E-E-A-T single-page score (0–100).
 *
 * Used by the single-page scanner to score Generative Engine Optimization and
 * E-E-A-T signals. No baseline — score is the sum of weighted factors so that
 * weak pages score low and strong pages score high.
 *
 * Factors (each 0 or 1): robots allow AI, llms.txt, Schema.org, tables, FAQs,
 * citations > 5, author bio, impressum, contact, about. Total max 100.
 */

export interface GeoEeatPageScoreInput {
  hasLlmsTxt: boolean;
  hasRobotsAllowingAI: boolean;
  schemaCoverage: string[];
  tableCount: number;
  faqCount: number;
  citationCount: number;
  hasAuthorBio: boolean;
  /** E-E-A-T trust/experience signals */
  eeat?: {
    hasImpressum: boolean;
    hasContact: boolean;
    hasAboutLink: boolean;
    hasTeamLink?: boolean;
    hasCaseStudyMention?: boolean;
  };
}

/** Same shape as GenerativeEngineAudit.scoreBreakdown for UI compatibility. */
export interface GeoEeatScoreFactor {
  factor: string;
  points: number;
}

export interface GeoEeatPageScoreResult {
  score: number;
  scoreBreakdown: GeoEeatScoreFactor[];
}

const P = 10; // points per factor (10 factors × 10 = 100)

/**
 * Computes 0–100 GEO/E-E-A-T score for a single page.
 * No baseline: score = sum of earned points (each factor contributes P points if present).
 * Robots blocking AI: that factor contributes 0 (no "Basis" bonus).
 */
export function computeGeoEeatPageScore(input: GeoEeatPageScoreInput): GeoEeatPageScoreResult {
  const {
    hasLlmsTxt,
    hasRobotsAllowingAI,
    schemaCoverage,
    tableCount,
    faqCount,
    citationCount,
    hasAuthorBio,
    eeat,
  } = input;

  const breakdown: GeoEeatScoreFactor[] = [];
  let earned = 0;

  const add = (factor: string, present: boolean) => {
    const points = present ? P : 0;
    earned += points;
    breakdown.push({ factor, points });
  };

  add('Robots erlauben AI', hasRobotsAllowingAI);
  add('llms.txt', hasLlmsTxt);
  add('Schema.org', schemaCoverage.length > 0);
  add('Tabellen', tableCount > 0);
  add('FAQs', faqCount > 0);
  add('Zitate (>5)', citationCount > 5);
  add('Autoren-Bio', hasAuthorBio);
  add('Impressum (E-E-A-T)', eeat?.hasImpressum ?? false);
  add('Kontakt (E-E-A-T)', eeat?.hasContact ?? false);
  add('Über uns (E-E-A-T)', eeat?.hasAboutLink ?? false);

  const score = Math.max(0, Math.min(100, earned));

  return {
    score,
    scoreBreakdown: breakdown,
  };
}
