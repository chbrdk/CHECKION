/**
 * Domain (deep) scan aggregation: same categories as single scan,
 * with values intelligently aggregated across all pages.
 */
import { DOMAIN_STORED_SUMMARY_PAGE_CLASSIFICATION_THEME_RELATED_PAGES_CAP } from './constants';
import { isSeoStopword } from './seo-stopwords';
import type {
  ScanResult,
  Issue,
  ScanStats,
  UxResult,
  SeoAudit,
  LinkAudit,
  LinkResult,
  GeoAudit,
  PrivacyAudit,
  SecurityAudit,
  TechnicalInsights,
  GenerativeEngineAudit,
  AggregatedPageClassification,
  AggregatedPageClassificationPageSample,
  AggregatedPageClassificationProfile,
  AggregatedPageClassificationTheme,
  AggregatedPageClassificationThemeRelatedPage,
  TagTier,
} from './types';

/** Issue grouped by code across pages; one representative issue + page list. */
export interface AggregatedIssue extends Issue {
  pageCount: number;
  pageUrls: string[];
}

export interface AggregatedIssuesResult {
  issues: AggregatedIssue[];
  stats: ScanStats;
  levelStats: { A: number; AA: number; AAA: number; APCA: number; Unknown: number };
  /** Per-page issue counts, sorted by errors desc (worst first). */
  pagesByIssueCount: Array<{ url: string; errors: number; warnings: number; notices: number }>;
}

function mergeStats(pages: ScanResult[]): ScanStats {
  let errors = 0, warnings = 0, notices = 0;
  for (const p of pages) {
    errors += p.stats?.errors ?? 0;
    warnings += p.stats?.warnings ?? 0;
    notices += p.stats?.notices ?? 0;
  }
  return { errors, warnings, notices, total: errors + warnings + notices };
}

/** Group issues by code+type+message, collect page URLs. */
export function aggregateIssues(pages: ScanResult[]): AggregatedIssuesResult {
  const byKey = new Map<string, { issue: Issue; pageUrls: Set<string> }>();
  const levelCounts = { A: 0, AA: 0, AAA: 0, APCA: 0, Unknown: 0 };

  for (const page of pages) {
    for (const issue of page.issues ?? []) {
      const key = `${issue.code}|${issue.type}|${issue.message}`;
      if (!byKey.has(key)) {
        byKey.set(key, { issue: { ...issue }, pageUrls: new Set() });
      }
      byKey.get(key)!.pageUrls.add(page.url);
      const l = issue.wcagLevel ?? 'Unknown';
      if (l === 'A') levelCounts.A++;
      else if (l === 'AA') levelCounts.AA++;
      else if (l === 'AAA') levelCounts.AAA++;
      else if (l === 'APCA') levelCounts.APCA++;
      else levelCounts.Unknown++;
    }
  }

  const issues: AggregatedIssue[] = Array.from(byKey.entries())
    .map(([, v]) => ({
      ...v.issue,
      pageCount: v.pageUrls.size,
      pageUrls: Array.from(v.pageUrls),
    }))
    .sort((a, b) => b.pageCount - a.pageCount);

  const stats = mergeStats(pages);
  const pagesByIssueCount = pages.map((p) => ({
    url: p.url,
    errors: p.stats?.errors ?? 0,
    warnings: p.stats?.warnings ?? 0,
    notices: p.stats?.notices ?? 0,
  })).sort((a, b) => b.errors - a.errors || b.warnings - a.warnings);
  return { issues, stats, levelStats: levelCounts, pagesByIssueCount };
}

/** FK grade-level buckets (aligned with `lib/scanner.ts`). */
export type ReadabilityBandKey = 'easy' | 'standard' | 'complex' | 'veryComplex';

const READABILITY_EMPTY_BANDS: Record<ReadabilityBandKey, number> = {
  easy: 0,
  standard: 0,
  complex: 0,
  veryComplex: 0,
};

function readabilityBandFromScore(score: number): ReadabilityBandKey {
  if (score <= 6) return 'easy';
  if (score <= 10) return 'standard';
  if (score <= 14) return 'complex';
  return 'veryComplex';
}

/** Bucket labels match per-page FK grade in `lib/scanner.ts` (English strings on purpose). */
function readabilityGradeFromLevel(level: number): string {
  if (level <= 6) return 'Easy (6th Grade)';
  if (level <= 10) return 'Standard (High School)';
  if (level <= 14) return 'Complex (College)';
  return 'Very Complex (Academic)';
}

/** Aggregated UX: averages + merged lists (broken links with pageUrl). */
export interface AggregatedUx {
  score: number;
  cls: number;
  readability: {
    grade: string;
    /** Mean FK grade level over pages that have readability (one decimal). */
    score: number;
    minScore: number;
    maxScore: number;
    bandCounts: Record<ReadabilityBandKey, number>;
    hardestPages: Array<{ url: string; score: number; grade: string }>;
    pagesWithReadability: number;
  };
  tapTargets: { issues: string[]; detailsByPage: Array<{ url: string; count: number }> };
  /** Focus-order items per page (for visual/tab-order analysis). */
  focusOrderByPage: Array<{ url: string; count: number }>;
  brokenLinks: Array<{ href: string; status: number; text: string; pageUrl: string }>;
  consoleErrorsByPage: Array<{ url: string; count: number }>;
  headingHierarchy: {
    pagesWithMultipleH1: number;
    pagesWithSkippedLevels: number;
    totalPages: number;
  };
  pageCount: number;
  /** Pages sorted by UX score asc (worst first) for prioritization. */
  pagesByScore: Array<{ url: string; score: number; cls: number }>;
}

export function aggregateUx(pages: ScanResult[]): AggregatedUx | null {
  const withUx = pages.filter((p) => p.ux != null);
  if (withUx.length === 0) return null;

  let scoreSum = 0, clsSum = 0, readScoreSum = 0;
  const tapIssuesSet = new Set<string>();
  const brokenLinks: AggregatedUx['brokenLinks'] = [];
  const detailsByPage: AggregatedUx['tapTargets']['detailsByPage'] = [];
  const focusOrderByPage: Array<{ url: string; count: number }> = [];
  const consoleErrorsByPage: AggregatedUx['consoleErrorsByPage'] = [];
  const pagesByScore: Array<{ url: string; score: number; cls: number }> = [];
  let pagesWithMultipleH1 = 0, pagesWithSkippedLevels = 0;
  const bandCounts: Record<ReadabilityBandKey, number> = { ...READABILITY_EMPTY_BANDS };
  const readabilityRows: Array<{ url: string; score: number; grade: string }> = [];

  for (const p of withUx) {
    const ux = p.ux!;
    scoreSum += ux.score;
    clsSum += ux.cls;
    pagesByScore.push({ url: p.url, score: ux.score, cls: ux.cls });
    if (ux.readability?.score != null) {
      const sc = ux.readability.score;
      readScoreSum += sc;
      const grade = ux.readability.grade ?? readabilityGradeFromLevel(sc);
      readabilityRows.push({ url: p.url, score: sc, grade });
      bandCounts[readabilityBandFromScore(sc)]++;
    }
    (ux.tapTargets?.issues ?? []).forEach((i) => tapIssuesSet.add(i));
    const tapCount = ux.tapTargets?.details?.length ?? 0;
    if (tapCount > 0) detailsByPage.push({ url: p.url, count: tapCount });
    const focusCount = ux.focusOrder?.length ?? 0;
    if (focusCount > 0) focusOrderByPage.push({ url: p.url, count: focusCount });
    (ux.brokenLinks ?? []).forEach((l) => brokenLinks.push({ ...l, pageUrl: p.url }));
    const errCount = ux.consoleErrors?.length ?? 0;
    if (errCount > 0) consoleErrorsByPage.push({ url: p.url, count: errCount });
    if (ux.headingHierarchy) {
      if (!ux.headingHierarchy.hasSingleH1 || (ux.headingHierarchy.h1Count ?? 0) > 1) pagesWithMultipleH1++;
      if ((ux.headingHierarchy.skippedLevels?.length ?? 0) > 0) pagesWithSkippedLevels++;
    }
  }

  pagesByScore.sort((a, b) => a.score - b.score);

  const n = withUx.length;
  const pagesWithReadability = readabilityRows.length;
  const avgReadLevel = pagesWithReadability > 0 ? readScoreSum / pagesWithReadability : 0;
  const minScore =
    pagesWithReadability > 0 ? Math.min(...readabilityRows.map((r) => r.score)) : 0;
  const maxScore =
    pagesWithReadability > 0 ? Math.max(...readabilityRows.map((r) => r.score)) : 0;
  const hardestPages = [...readabilityRows]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return {
    score: Math.round(scoreSum / n),
    cls: Math.round((clsSum / n) * 1000) / 1000,
    readability: {
      grade: pagesWithReadability ? readabilityGradeFromLevel(avgReadLevel) : '',
      score: pagesWithReadability ? Number(avgReadLevel.toFixed(1)) : 0,
      minScore: pagesWithReadability ? Number(minScore.toFixed(1)) : 0,
      maxScore: pagesWithReadability ? Number(maxScore.toFixed(1)) : 0,
      bandCounts,
      hardestPages,
      pagesWithReadability,
    },
    tapTargets: { issues: Array.from(tapIssuesSet), detailsByPage },
    focusOrderByPage,
    brokenLinks,
    consoleErrorsByPage,
    headingHierarchy: {
      pagesWithMultipleH1,
      pagesWithSkippedLevels,
      totalPages: n,
    },
    pageCount: n,
    pagesByScore,
  };
}

/** Keyword aggregated across multiple pages (domain-wide). */
export interface CrossPageKeyword {
  keyword: string;
  totalCount: number;
  pageCount: number;
  avgDensityPercent: number;
  pageUrls: string[];
}

/** Per-page SEO summary including content/density. */
export interface PageSeoSummary {
  url: string;
  title: string | null;
  hasMeta: boolean;
  hasH1: boolean;
  wordCount: number;
  topKeywordCount: number;
  /** True if body word count < 300 (skinny content). */
  isSkinny: boolean;
}

/** SEO: counts across pages + cross-page keywords + per-page density. */
export interface AggregatedSeo {
  totalPages: number;
  withTitle: number;
  withMetaDescription: number;
  withH1: number;
  withCanonical: number;
  missingMetaDescriptionUrls: string[];
  missingH1Urls: string[];
  /** Pages without canonical link (optional for backward compat with old payloads). */
  missingCanonicalUrls?: string[];
  /** Pages with meta robots noindex (optional for backward compat). */
  pagesWithNoindex?: string[];
  /** Counts for social/OG (optional for backward compat). */
  withOgTitle?: number;
  withOgImage?: number;
  withOgDescription?: number;
  withTwitterCard?: number;
  pages: PageSeoSummary[];
  /** Keywords that appear on multiple pages, sorted by totalCount desc. */
  crossPageKeywords: CrossPageKeyword[];
  /** Total words across all pages (for domain-wide density context). */
  totalWordsAcrossPages: number;
}

const SKINNY_WORD_THRESHOLD = 300;

export function aggregateSeo(pages: ScanResult[]): AggregatedSeo | null {
  const withSeo = pages.filter((p) => p.seo != null);
  if (withSeo.length === 0) return null;

  let withTitle = 0, withMetaDescription = 0, withH1 = 0, withCanonical = 0;
  let withOgTitle = 0, withOgImage = 0, withOgDescription = 0, withTwitterCard = 0;
  const missingMetaDescriptionUrls: string[] = [];
  const missingH1Urls: string[] = [];
  const missingCanonicalUrls: string[] = [];
  const pagesWithNoindex: string[] = [];
  const pagesList: PageSeoSummary[] = [];
  const keywordMap = new Map<string, { totalCount: number; pageUrls: Set<string>; densitySum: number; densityCount: number }>();
  let totalWordsAcrossPages = 0;

  for (const p of withSeo) {
    const seo = p.seo!;
    if (seo.title?.trim()) withTitle++;
    if (seo.metaDescription?.trim()) withMetaDescription++;
    else missingMetaDescriptionUrls.push(p.url);
    if (seo.h1?.trim()) withH1++;
    else missingH1Urls.push(p.url);
    if (seo.canonical?.trim()) withCanonical++;
    else missingCanonicalUrls.push(p.url);
    if (seo.ogTitle?.trim()) withOgTitle++;
    if (seo.ogImage?.trim()) withOgImage++;
    if (seo.ogDescription?.trim()) withOgDescription++;
    if (seo.twitterCard?.trim()) withTwitterCard++;
    if (p.generative?.technical?.metaRobotsIndexable === false) pagesWithNoindex.push(p.url);

    const wordCount = seo.bodyWordCount ?? seo.keywordAnalysis?.totalWords ?? 0;
    totalWordsAcrossPages += wordCount;
    const topKeywords = seo.keywordAnalysis?.topKeywords ?? [];
    const topKeywordCount = topKeywords.length;

    pagesList.push({
      url: p.url,
      title: seo.title ?? null,
      hasMeta: !!(seo.metaDescription?.trim()),
      hasH1: !!(seo.h1?.trim()),
      wordCount,
      topKeywordCount,
      isSkinny: wordCount > 0 && wordCount < SKINNY_WORD_THRESHOLD,
    });

    for (const item of topKeywords) {
      const key = item.keyword.toLowerCase().trim();
      if (!key || isSeoStopword(key)) continue;
      const existing = keywordMap.get(key);
      if (existing) {
        existing.totalCount += item.count;
        existing.pageUrls.add(p.url);
        existing.densitySum += item.densityPercent;
        existing.densityCount += 1;
      } else {
        keywordMap.set(key, {
          totalCount: item.count,
          pageUrls: new Set([p.url]),
          densitySum: item.densityPercent,
          densityCount: 1,
        });
      }
    }
  }

  const crossPageKeywords: CrossPageKeyword[] = Array.from(keywordMap.entries())
    .filter(([keyword]) => !isSeoStopword(keyword))
    .map(([keyword, data]) => ({
      keyword,
      totalCount: data.totalCount,
      pageCount: data.pageUrls.size,
      avgDensityPercent: data.densityCount > 0 ? Math.round((data.densitySum / data.densityCount) * 100) / 100 : 0,
      pageUrls: Array.from(data.pageUrls),
    }))
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 50);

  return {
    totalPages: withSeo.length,
    withTitle,
    withMetaDescription,
    withH1,
    withCanonical,
    missingMetaDescriptionUrls,
    missingH1Urls,
    missingCanonicalUrls,
    pagesWithNoindex,
    withOgTitle,
    withOgImage,
    withOgDescription,
    withTwitterCard,
    pages: pagesList.sort((a, b) => b.wordCount - a.wordCount),
    crossPageKeywords,
    totalWordsAcrossPages,
  };
}

/** Performance: averages across all pages (every ScanResult has performance). */
export interface AggregatedPerformance {
  avgTtfb: number;
  avgFcp: number;
  avgLcp: number;
  avgDomLoad: number;
  pageCount: number;
}

export function aggregatePerformance(pages: ScanResult[]): AggregatedPerformance | null {
  if (pages.length === 0) return null;
  let ttfb = 0, fcp = 0, lcp = 0, domLoad = 0;
  for (const p of pages) {
    const perf = p.performance;
    if (!perf) continue;
    ttfb += perf.ttfb ?? 0;
    fcp += perf.fcp ?? 0;
    lcp += perf.lcp ?? 0;
    domLoad += perf.domLoad ?? 0;
  }
  const n = pages.filter((p) => p.performance != null).length;
  if (n === 0) return null;
  return {
    avgTtfb: Math.round(ttfb / n),
    avgFcp: Math.round(fcp / n),
    avgLcp: Math.round(lcp / n),
    avgDomLoad: Math.round(domLoad / n),
    pageCount: n,
  };
}

/** Eco: average CO2, total page weight, grade distribution. */
export type EcoGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface AggregatedEco {
  avgCo2: number;
  totalPageWeight: number;
  /** Count per grade (e.g. { A: 3, B: 2 }). */
  gradeDistribution: Record<string, number>;
  pageCount: number;
}

export function aggregateEco(pages: ScanResult[]): AggregatedEco | null {
  const withEco = pages.filter((p) => p.eco != null);
  if (withEco.length === 0) return null;
  let co2Sum = 0, weightSum = 0;
  const gradeDistribution: Record<string, number> = {};
  for (const p of withEco) {
    const eco = p.eco!;
    co2Sum += eco.co2 ?? 0;
    weightSum += eco.pageWeight ?? 0;
    const g = (eco.grade ?? '') as string;
    if (g) gradeDistribution[g] = (gradeDistribution[g] ?? 0) + 1;
  }
  const n = withEco.length;
  return {
    avgCo2: Math.round((co2Sum / n) * 100) / 100,
    totalPageWeight: weightSum,
    gradeDistribution,
    pageCount: n,
  };
}

/** Links: merge broken links, add pageUrl. */
export interface AggregatedLinks {
  broken: Array<LinkResult & { pageUrl: string }>;
  totalLinks: number;
  internal: number;
  external: number;
  uniqueBrokenUrls: number;
  /** Per-page broken count, sorted desc (pages with most broken first). */
  brokenByPage: Array<{ url: string; count: number }>;
}

export function aggregateLinks(pages: ScanResult[]): AggregatedLinks | null {
  const withLinks = pages.filter((p) => p.links != null);
  if (withLinks.length === 0) return null;

  const broken: AggregatedLinks['broken'] = [];
  let totalLinks = 0, internal = 0, external = 0;
  const uniqueBroken = new Set<string>();
  const brokenByPage: Array<{ url: string; count: number }> = [];

  for (const p of withLinks) {
    const links = p.links!;
    totalLinks += links.total ?? 0;
    internal += links.internal ?? 0;
    external += links.external ?? 0;
    const brokenCount = links.broken?.length ?? 0;
    if (brokenCount > 0) brokenByPage.push({ url: p.url, count: brokenCount });
    (links.broken ?? []).forEach((b) => {
      broken.push({ ...b, pageUrl: p.url });
      uniqueBroken.add(b.url);
    });
  }

  brokenByPage.sort((a, b) => b.count - a.count);

  return {
    broken,
    totalLinks,
    internal,
    external,
    uniqueBrokenUrls: uniqueBroken.size,
    brokenByPage,
  };
}

/** Technical insights aggregated counts (for share/deep scan). */
export interface AggregatedTechnicalCounts {
  pageCount: number;
  withManifest: number;
  withThemeColor: number;
  withAppleTouchIcon: number;
  withServiceWorker: number;
  withMetaRefresh: number;
  pagesWithRedirects: number;
  totalThirdPartyDomains: number;
}

/** Infra: counts and URL lists per category. */
export interface AggregatedInfra {
  geo: { pageCount: number; sample: GeoAudit | null };
  privacy: {
    withPolicy: number;
    withCookieBanner: number;
    withTerms: number;
    totalPages: number;
    urlsWithPolicy: string[];
    urlsWithCookieBanner: string[];
    urlsWithTerms: string[];
  };
  security: {
    withCsp: number;
    withXFrame: number;
    totalPages: number;
    urlsWithCsp: string[];
    urlsWithXFrame: string[];
  };
  technical: TechnicalInsights | null;
  /** Aggregated counts for technical insights (for share). */
  technicalCounts: AggregatedTechnicalCounts | null;
}

export function aggregateInfra(pages: ScanResult[]): AggregatedInfra | null {
  const withAny = pages.filter(
    (p) => p.geo != null || p.privacy != null || p.security != null || p.technicalInsights != null
  );
  if (withAny.length === 0) return null;

  const urlsWithPolicy: string[] = [];
  const urlsWithCookieBanner: string[] = [];
  const urlsWithTerms: string[] = [];
  const urlsWithCsp: string[] = [];
  const urlsWithXFrame: string[] = [];
  let geoSample: GeoAudit | null = null;
  let technical: TechnicalInsights | null = null;

  for (const p of pages) {
    if (p.geo) geoSample ??= p.geo;
    if (p.privacy) {
      if (p.privacy.hasPrivacyPolicy) urlsWithPolicy.push(p.url);
      if (p.privacy.hasCookieBanner) urlsWithCookieBanner.push(p.url);
      if (p.privacy.hasTermsOfService) urlsWithTerms.push(p.url);
    }
    if (p.security) {
      if (p.security.contentSecurityPolicy?.present) urlsWithCsp.push(p.url);
      if (p.security.xFrameOptions?.present) urlsWithXFrame.push(p.url);
    }
    if (p.technicalInsights) technical ??= p.technicalInsights;
  }

  const withPrivacy = pages.filter((p) => p.privacy != null).length;
  const withSecurity = pages.filter((p) => p.security != null).length;

  // Technical insights counts across pages
  const withTech = pages.filter((p) => p.technicalInsights != null);
  let technicalCounts: AggregatedTechnicalCounts | null = null;
  if (withTech.length > 0) {
    let withManifest = 0, withThemeColor = 0, withAppleTouchIcon = 0, withServiceWorker = 0;
    let withMetaRefresh = 0, pagesWithRedirects = 0, totalThirdPartyDomains = 0;
    for (const p of withTech) {
      const t = p.technicalInsights!;
      if (t.manifest?.present) withManifest++;
      if (t.themeColor != null && t.themeColor) withThemeColor++;
      if (t.appleTouchIcon != null && t.appleTouchIcon) withAppleTouchIcon++;
      if (t.serviceWorkerRegistered) withServiceWorker++;
      if (t.metaRefreshPresent) withMetaRefresh++;
      if ((t.redirectCount ?? 0) > 0) pagesWithRedirects++;
      totalThirdPartyDomains += (t.thirdPartyDomains?.length ?? 0);
    }
    technicalCounts = {
      pageCount: withTech.length,
      withManifest,
      withThemeColor,
      withAppleTouchIcon,
      withServiceWorker,
      withMetaRefresh,
      pagesWithRedirects,
      totalThirdPartyDomains,
    };
  }

  return {
    geo: { pageCount: pages.filter((p) => p.geo != null).length, sample: geoSample },
    privacy: {
      withPolicy: urlsWithPolicy.length,
      withCookieBanner: urlsWithCookieBanner.length,
      withTerms: urlsWithTerms.length,
      totalPages: withPrivacy || pages.length,
      urlsWithPolicy,
      urlsWithCookieBanner,
      urlsWithTerms,
    },
    security: {
      withCsp: urlsWithCsp.length,
      withXFrame: urlsWithXFrame.length,
      totalPages: withSecurity || pages.length,
      urlsWithCsp,
      urlsWithXFrame,
    },
    technical,
    technicalCounts,
  };
}

/** E-E-A-T on-page signals aggregated from deep scan (for GEO analysis page). */
export interface AggregatedEeatOnPage {
  withImpressum: number;
  withPrivacy: number;
  withContact: number;
  withAboutLink: number;
  withTeamLink: number;
  withCaseStudyMention: number;
  totalPages: number;
}

export function aggregateEeatOnPage(pages: ScanResult[]): AggregatedEeatOnPage {
  let withImpressum = 0, withPrivacy = 0, withContact = 0, withAboutLink = 0, withTeamLink = 0, withCaseStudyMention = 0;
  for (const p of pages) {
    if (p.eeatSignals?.hasImpressum) withImpressum++;
    if (p.privacy?.hasPrivacyPolicy) withPrivacy++;
    if (p.eeatSignals?.hasContact) withContact++;
    if (p.eeatSignals?.hasAboutLink) withAboutLink++;
    if (p.eeatSignals?.hasTeamLink) withTeamLink++;
    if (p.eeatSignals?.hasCaseStudyMention) withCaseStudyMention++;
  }
  return {
    withImpressum,
    withPrivacy,
    withContact,
    withAboutLink,
    withTeamLink,
    withCaseStudyMention,
    totalPages: pages.length,
  };
}

/** Generative (GEO): average score + content summary + per-page. */
export interface AggregatedGenerative {
  score: number;
  pageCount: number;
  withLlmsTxt: number;
  withRobotsAllowingAi: number;
  /** Averages across pages (faqCount, listDensity, citationDensity). */
  contentSummary: { avgFaqCount: number; avgListDensity: number; avgCitationDensity: number };
  pages: Array<{ url: string; score: number; hasLlmsTxt: boolean; hasRecommendedSchema: boolean }>;
}

export function aggregateGenerative(pages: ScanResult[]): AggregatedGenerative | null {
  const withGen = pages.filter((p) => p.generative != null);
  if (withGen.length === 0) return null;

  let scoreSum = 0, withLlmsTxt = 0, withRobotsAllowingAi = 0;
  let faqSum = 0, listDensitySum = 0, citationDensitySum = 0;
  const pagesList: AggregatedGenerative['pages'] = [];

  for (const p of withGen) {
    const g = p.generative!;
    scoreSum += g.score;
    if (g.technical?.hasLlmsTxt) withLlmsTxt++;
    if (g.technical?.hasRobotsAllowingAI) withRobotsAllowingAi++;
    const content = g.content;
    if (content) {
      faqSum += content.faqCount ?? 0;
      listDensitySum += content.listDensity ?? 0;
      citationDensitySum += content.citationDensity ?? 0;
    }
    const hasRecommendedSchema = (g.technical?.recommendedSchemaTypesFound?.length ?? 0) > 0;
    pagesList.push({
      url: p.url,
      score: g.score,
      hasLlmsTxt: g.technical?.hasLlmsTxt ?? false,
      hasRecommendedSchema,
    });
  }

  const n = withGen.length;
  return {
    score: Math.round(scoreSum / n),
    pageCount: n,
    withLlmsTxt,
    withRobotsAllowingAi,
    contentSummary: {
      avgFaqCount: Math.round((faqSum / n) * 10) / 10,
      avgListDensity: Math.round((listDensitySum / n) * 100) / 100,
      avgCitationDensity: Math.round((citationDensitySum / n) * 100) / 100,
    },
    pages: pagesList,
  };
}

/** Structure: heading/semantic issues across pages. */
export interface AggregatedStructure {
  pagesWithHeadingIssues: number;
  pagesWithMultipleH1: string[];
  pagesWithSkippedLevels: string[];
  /** Pages with single H1 and no skipped levels. */
  pagesWithGoodStructure: string[];
  totalPages: number;
}

export function aggregateStructure(pages: ScanResult[]): AggregatedStructure | null {
  const withUx = pages.filter((p) => p.ux?.headingHierarchy != null);
  if (withUx.length === 0) return null;

  const pagesWithMultipleH1: string[] = [];
  const pagesWithSkippedLevels: string[] = [];
  const pagesWithGoodStructure: string[] = [];

  for (const p of withUx) {
    const h = p.ux!.headingHierarchy!;
    const multiH1 = !h.hasSingleH1 || (h.h1Count ?? 0) > 1;
    const skipped = (h.skippedLevels?.length ?? 0) > 0;
    if (multiH1) pagesWithMultipleH1.push(p.url);
    if (skipped) pagesWithSkippedLevels.push(p.url);
    if (!multiH1 && !skipped) pagesWithGoodStructure.push(p.url);
  }

  return {
    pagesWithHeadingIssues: pagesWithMultipleH1.length + pagesWithSkippedLevels.length,
    pagesWithMultipleH1,
    pagesWithSkippedLevels,
    pagesWithGoodStructure,
    totalPages: withUx.length,
  };
}

// ─── Page classification (tagTiers) domain rollup ─────────────────────────

/** Merge key: trim, lowercase, single spaces. */
export function normalizePageTopicTagKey(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Tags that are usually chrome/boilerplate in LLM output; dampen weight (×0.25) so real topics rank higher.
 */
const PAGE_TOPIC_BOILERPLATE_KEYS = new Set<string>([
  'navigation',
  'footer',
  'footer links',
  'jump to content',
  'site structure',
  'boilerplate',
  'boilerplate text',
]);

function isBoilerplateTopicKey(key: string): boolean {
  return PAGE_TOPIC_BOILERPLATE_KEYS.has(key);
}

function tierWeight(tier: number): number {
  return tier * tier;
}

function classifyPageProfile(
  counts: { t1: number; t2: number; t3: number; t4: number; t5: number },
): AggregatedPageClassificationProfile {
  const { t1, t2, t3, t4, t5 } = counts;
  const low = t1 + t2;
  const mid = t3 + t4;
  if (t5 >= 2) return 'pillar';
  if (t5 === 0 && low >= 4) return 'utility';
  if (mid >= 4 && t5 <= 1) return 'hub';
  return 'mixed';
}

type ThemeAcc = {
  displayTag: string;
  score: number;
  pageScanIds: Set<string>;
  tierSum: number;
  tierOccurrences: number;
  maxTier: 1 | 2 | 3 | 4 | 5;
};

function ingestTagTier(acc: ThemeAcc, entry: TagTier, pageScanId: string, weightMult: number): void {
  const w = tierWeight(entry.tier) * weightMult;
  acc.score += w;
  acc.pageScanIds.add(pageScanId);
  acc.tierSum += entry.tier;
  acc.tierOccurrences += 1;
  if (entry.tier > acc.maxTier) acc.maxTier = entry.tier;
}

function countTiersFromTagTiers(tiers: TagTier[]): {
  t1: number;
  t2: number;
  t3: number;
  t4: number;
  t5: number;
} {
  let t1 = 0,
    t2 = 0,
    t3 = 0,
    t4 = 0,
    t5 = 0;
  for (const entry of tiers) {
    const tier = entry.tier;
    if (tier === 1) t1++;
    else if (tier === 2) t2++;
    else if (tier === 3) t3++;
    else if (tier === 4) t4++;
    else t5++;
  }
  return { t1, t2, t3, t4, t5 };
}

function pageHasThemeTag(tiers: TagTier[], themeKey: string): boolean {
  for (const entry of tiers) {
    const key = normalizePageTopicTagKey(entry.tag);
    if (key && key === themeKey) return true;
  }
  return false;
}

function computeSubsetAvgTagsPerPageByTier(
  pages: ScanResult[],
  themeKey: string,
): {
  tier1: number;
  tier2: number;
  tier3: number;
  tier4: number;
  tier5: number;
} {
  let s1 = 0,
    s2 = 0,
    s3 = 0,
    s4 = 0,
    s5 = 0;
  let n = 0;
  for (const page of pages) {
    const tiers = page.pageClassification?.tagTiers;
    if (!tiers?.length) continue;
    if (!pageHasThemeTag(tiers, themeKey)) continue;
    const { t1, t2, t3, t4, t5 } = countTiersFromTagTiers(tiers);
    s1 += t1;
    s2 += t2;
    s3 += t3;
    s4 += t4;
    s5 += t5;
    n++;
  }
  if (n === 0) {
    return { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 };
  }
  return {
    tier1: Math.round((s1 / n) * 100) / 100,
    tier2: Math.round((s2 / n) * 100) / 100,
    tier3: Math.round((s3 / n) * 100) / 100,
    tier4: Math.round((s4 / n) * 100) / 100,
    tier5: Math.round((s5 / n) * 100) / 100,
  };
}

function pickRelatedPages(pageScanIds: Set<string>, pages: ScanResult[], cap: number): AggregatedPageClassificationThemeRelatedPage[] {
  const pageById = new Map(pages.map((p) => [p.id, p]));
  return [...pageScanIds]
    .filter((id) => pageById.has(id))
    .sort((a, b) => {
      const pa = pageById.get(a)!;
      const pb = pageById.get(b)!;
      if (pb.score !== pa.score) return pb.score - pa.score;
      return pa.url.localeCompare(pb.url);
    })
    .slice(0, cap)
    .map((id) => {
      const p = pageById.get(id)!;
      return { id: p.id, url: p.url };
    });
}

/**
 * Deterministic domain rollup of `pageClassification.tagTiers` across scanned pages.
 * Returns `undefined` only when `pages.length === 0`.
 */
export function aggregatePageClassification(pages: ScanResult[]): AggregatedPageClassification | undefined {
  if (pages.length === 0) return undefined;

  const totalPages = pages.length;
  let pagesWithClassification = 0;
  let pagesWithAtLeastOneTier5 = 0;
  let pagesDominatedByLowTiers = 0;

  let sumT1 = 0,
    sumT2 = 0,
    sumT3 = 0,
    sumT4 = 0,
    sumT5 = 0;

  const themeByKey = new Map<string, ThemeAcc>();
  const samples: AggregatedPageClassificationPageSample[] = [];

  for (const page of pages) {
    const tiers = page.pageClassification?.tagTiers;
    if (!tiers?.length) continue;

    pagesWithClassification += 1;

    let t1 = 0,
      t2 = 0,
      t3 = 0,
      t4 = 0,
      t5 = 0;

    for (const entry of tiers) {
      const tier = entry.tier;
      if (tier === 1) t1++;
      else if (tier === 2) t2++;
      else if (tier === 3) t3++;
      else if (tier === 4) t4++;
      else t5++;

      const key = normalizePageTopicTagKey(entry.tag);
      if (!key) continue;
      const damp = isBoilerplateTopicKey(key) ? 0.25 : 1;

      let acc = themeByKey.get(key);
      if (!acc) {
        acc = {
          displayTag: entry.tag.trim() || key,
          score: 0,
          pageScanIds: new Set(),
          tierSum: 0,
          tierOccurrences: 0,
          maxTier: tier,
        };
        themeByKey.set(key, acc);
      }
      ingestTagTier(acc, entry, page.id, damp);
    }

    sumT1 += t1;
    sumT2 += t2;
    sumT3 += t3;
    sumT4 += t4;
    sumT5 += t5;

    if (t5 >= 1) pagesWithAtLeastOneTier5 += 1;
    if (t1 + t2 > t4 + t5) pagesDominatedByLowTiers += 1;

    samples.push({
      url: page.url,
      profile: classifyPageProfile({ t1, t2, t3, t4, t5 }),
      tier5Count: t5,
      lowTierCount: t1 + t2,
    });
  }

  const relatedCap = DOMAIN_STORED_SUMMARY_PAGE_CLASSIFICATION_THEME_RELATED_PAGES_CAP;
  const topThemes: AggregatedPageClassificationTheme[] = Array.from(themeByKey.entries())
    .map(([themeKey, acc]) => ({
      tag: acc.displayTag,
      themeTagKey: themeKey,
      score: Math.round(acc.score * 100) / 100,
      pageCount: acc.pageScanIds.size,
      maxTier: acc.maxTier,
      avgTier: acc.tierOccurrences > 0 ? Math.round((acc.tierSum / acc.tierOccurrences) * 10) / 10 : 0,
      relatedPages: pickRelatedPages(acc.pageScanIds, pages, relatedCap),
      subsetAvgTagsPerPageByTier: computeSubsetAvgTagsPerPageByTier(pages, themeKey),
    }))
    .sort((a, b) => b.score - a.score || b.pageCount - a.pageCount);

  return {
    coverage: {
      totalPages,
      pagesWithClassification,
    },
    topThemes,
    tierDistribution: {
      avgTagsPerPageByTier: {
        tier1: Math.round((sumT1 / totalPages) * 100) / 100,
        tier2: Math.round((sumT2 / totalPages) * 100) / 100,
        tier3: Math.round((sumT3 / totalPages) * 100) / 100,
        tier4: Math.round((sumT4 / totalPages) * 100) / 100,
        tier5: Math.round((sumT5 / totalPages) * 100) / 100,
      },
      pagesWithAtLeastOneTier5,
      pagesDominatedByLowTiers,
    },
    pageSamples: samples,
  };
}
