/**
 * Domain (deep) scan aggregation: same categories as single scan,
 * with values intelligently aggregated across all pages.
 */
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

  const issues: AggregatedIssue[] = Array.from(byKey.entries()).map(([, v]) => ({
    ...v.issue,
    pageCount: v.pageUrls.size,
    pageUrls: Array.from(v.pageUrls),
  }));

  const stats = mergeStats(pages);
  return { issues, stats, levelStats: levelCounts };
}

/** Aggregated UX: averages + merged lists (broken links with pageUrl). */
export interface AggregatedUx {
  score: number;
  cls: number;
  readability: { grade: string; score: number };
  tapTargets: { issues: string[]; detailsByPage: Array<{ url: string; count: number }> };
  brokenLinks: Array<{ href: string; status: number; text: string; pageUrl: string }>;
  consoleErrorsByPage: Array<{ url: string; count: number }>;
  headingHierarchy: {
    pagesWithMultipleH1: number;
    pagesWithSkippedLevels: number;
    totalPages: number;
  };
  pageCount: number;
}

export function aggregateUx(pages: ScanResult[]): AggregatedUx | null {
  const withUx = pages.filter((p) => p.ux != null);
  if (withUx.length === 0) return null;

  let scoreSum = 0, clsSum = 0, readScoreSum = 0;
  const tapIssuesSet = new Set<string>();
  const brokenLinks: AggregatedUx['brokenLinks'] = [];
  const detailsByPage: AggregatedUx['tapTargets']['detailsByPage'] = [];
  const consoleErrorsByPage: AggregatedUx['consoleErrorsByPage'] = [];
  let pagesWithMultipleH1 = 0, pagesWithSkippedLevels = 0;
  let readGrade = '';

  for (const p of withUx) {
    const ux = p.ux!;
    scoreSum += ux.score;
    clsSum += ux.cls;
    if (ux.readability?.score != null) {
      readScoreSum += ux.readability.score;
      if (!readGrade) readGrade = ux.readability.grade ?? '';
    }
    (ux.tapTargets?.issues ?? []).forEach((i) => tapIssuesSet.add(i));
    const tapCount = ux.tapTargets?.details?.length ?? 0;
    if (tapCount > 0) detailsByPage.push({ url: p.url, count: tapCount });
    (ux.brokenLinks ?? []).forEach((l) => brokenLinks.push({ ...l, pageUrl: p.url }));
    const errCount = ux.consoleErrors?.length ?? 0;
    if (errCount > 0) consoleErrorsByPage.push({ url: p.url, count: errCount });
    if (ux.headingHierarchy) {
      if (!ux.headingHierarchy.hasSingleH1 || (ux.headingHierarchy.h1Count ?? 0) > 1) pagesWithMultipleH1++;
      if ((ux.headingHierarchy.skippedLevels?.length ?? 0) > 0) pagesWithSkippedLevels++;
    }
  }

  const n = withUx.length;
  return {
    score: Math.round(scoreSum / n),
    cls: Math.round((clsSum / n) * 1000) / 1000,
    readability: { grade: readGrade, score: n ? Math.round(readScoreSum / n) : 0 },
    tapTargets: { issues: Array.from(tapIssuesSet), detailsByPage },
    brokenLinks,
    consoleErrorsByPage,
    headingHierarchy: {
      pagesWithMultipleH1,
      pagesWithSkippedLevels,
      totalPages: n,
    },
    pageCount: n,
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
  const missingMetaDescriptionUrls: string[] = [];
  const missingH1Urls: string[] = [];
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
      if (!key) continue;
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
    pages: pagesList.sort((a, b) => b.wordCount - a.wordCount),
    crossPageKeywords,
    totalWordsAcrossPages,
  };
}

/** Links: merge broken links, add pageUrl. */
export interface AggregatedLinks {
  broken: Array<LinkResult & { pageUrl: string }>;
  totalLinks: number;
  internal: number;
  external: number;
  uniqueBrokenUrls: number;
}

export function aggregateLinks(pages: ScanResult[]): AggregatedLinks | null {
  const withLinks = pages.filter((p) => p.links != null);
  if (withLinks.length === 0) return null;

  const broken: AggregatedLinks['broken'] = [];
  let totalLinks = 0, internal = 0, external = 0;
  const uniqueBroken = new Set<string>();

  for (const p of withLinks) {
    const links = p.links!;
    totalLinks += links.total ?? 0;
    internal += links.internal ?? 0;
    external += links.external ?? 0;
    (links.broken ?? []).forEach((b) => {
      broken.push({ ...b, pageUrl: p.url });
      uniqueBroken.add(b.url);
    });
  }

  return {
    broken,
    totalLinks,
    internal,
    external,
    uniqueBrokenUrls: uniqueBroken.size,
  };
}

/** Infra: counts and merged data. */
export interface AggregatedInfra {
  geo: { pageCount: number; sample: GeoAudit | null };
  privacy: { withPolicy: number; withCookieBanner: number; withTerms: number; totalPages: number };
  security: { withCsp: number; withXFrame: number; totalPages: number };
  technical: TechnicalInsights | null; // merged from first page or merge logic
}

export function aggregateInfra(pages: ScanResult[]): AggregatedInfra | null {
  const withAny = pages.filter(
    (p) => p.geo != null || p.privacy != null || p.security != null || p.technicalInsights != null
  );
  if (withAny.length === 0) return null;

  let withPolicy = 0, withCookieBanner = 0, withTerms = 0;
  let withCsp = 0, withXFrame = 0;
  let geoSample: GeoAudit | null = null;
  let technical: TechnicalInsights | null = null;

  for (const p of pages) {
    if (p.geo) geoSample ??= p.geo;
    if (p.privacy) {
      if (p.privacy.hasPrivacyPolicy) withPolicy++;
      if (p.privacy.hasCookieBanner) withCookieBanner++;
      if (p.privacy.hasTermsOfService) withTerms++;
    }
    if (p.security) {
      if (p.security.contentSecurityPolicy?.present) withCsp++;
      if (p.security.xFrameOptions?.present) withXFrame++;
    }
    if (p.technicalInsights) technical ??= p.technicalInsights;
  }

  const withPrivacy = pages.filter((p) => p.privacy != null).length;
  const withSecurity = pages.filter((p) => p.security != null).length;

  return {
    geo: { pageCount: pages.filter((p) => p.geo != null).length, sample: geoSample },
    privacy: {
      withPolicy,
      withCookieBanner,
      withTerms,
      totalPages: withPrivacy || pages.length,
    },
    security: { withCsp, withXFrame, totalPages: withSecurity || pages.length },
    technical,
  };
}

/** Generative (GEO): average score + merged technical/content. */
export interface AggregatedGenerative {
  score: number;
  pageCount: number;
  withLlmsTxt: number;
  withRobotsAllowingAi: number;
  pages: Array<{ url: string; score: number; hasLlmsTxt: boolean }>;
}

export function aggregateGenerative(pages: ScanResult[]): AggregatedGenerative | null {
  const withGen = pages.filter((p) => p.generative != null);
  if (withGen.length === 0) return null;

  let scoreSum = 0, withLlmsTxt = 0, withRobotsAllowingAi = 0;
  const pagesList: AggregatedGenerative['pages'] = [];

  for (const p of withGen) {
    const g = p.generative!;
    scoreSum += g.score;
    if (g.technical?.hasLlmsTxt) withLlmsTxt++;
    if (g.technical?.hasRobotsAllowingAI) withRobotsAllowingAi++;
    pagesList.push({
      url: p.url,
      score: g.score,
      hasLlmsTxt: g.technical?.hasLlmsTxt ?? false,
    });
  }

  return {
    score: Math.round(scoreSum / withGen.length),
    pageCount: withGen.length,
    withLlmsTxt,
    withRobotsAllowingAi,
    pages: pagesList,
  };
}

/** Structure: heading/semantic issues across pages. */
export interface AggregatedStructure {
  pagesWithHeadingIssues: number;
  pagesWithMultipleH1: string[];
  pagesWithSkippedLevels: string[];
  totalPages: number;
}

export function aggregateStructure(pages: ScanResult[]): AggregatedStructure | null {
  const withUx = pages.filter((p) => p.ux?.headingHierarchy != null);
  if (withUx.length === 0) return null;

  const pagesWithMultipleH1: string[] = [];
  const pagesWithSkippedLevels: string[] = [];

  for (const p of withUx) {
    const h = p.ux!.headingHierarchy!;
    if (!h.hasSingleH1 || (h.h1Count ?? 0) > 1) pagesWithMultipleH1.push(p.url);
    if ((h.skippedLevels?.length ?? 0) > 0) pagesWithSkippedLevels.push(p.url);
  }

  return {
    pagesWithHeadingIssues: pagesWithMultipleH1.length + pagesWithSkippedLevels.length,
    pagesWithMultipleH1,
    pagesWithSkippedLevels,
    totalPages: withUx.length,
  };
}
