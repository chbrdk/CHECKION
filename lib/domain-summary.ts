/**
 * Domain summary: built from stored payload (new format) or from full pages (legacy).
 * New format: domain_scans.payload already has pages: SlimPage[] and aggregated (computed during deep scan).
 */
import {
    aggregateIssues,
    aggregateUx,
    aggregateSeo,
    aggregateLinks,
    aggregateInfra,
    aggregateEeatOnPage,
    aggregateGenerative,
    aggregateStructure,
    aggregatePerformance,
    aggregateEco,
} from './domain-aggregation';
import {
    DOMAIN_LIGHT_SUMMARY_GENERATIVE_PAGES_CAP,
    DOMAIN_LIGHT_SUMMARY_INFRA_URL_LIST_CAP,
    DOMAIN_LIGHT_SUMMARY_LINKS_BROKEN_BY_PAGE_CAP,
    DOMAIN_LIGHT_SUMMARY_LINKS_BROKEN_CAP,
    DOMAIN_LIGHT_SUMMARY_SEO_KEYWORDS_CAP,
    DOMAIN_LIGHT_SUMMARY_SEO_URL_SAMPLE_CAP,
    DOMAIN_LIGHT_SUMMARY_STRUCTURE_URL_LIST_CAP,
    DOMAIN_LIGHT_SUMMARY_UX_BROKEN_LINKS_CAP,
    DOMAIN_LIGHT_SUMMARY_UX_LIST_CAP,
} from './constants';
import type { ScanResult, DomainScanResult, SlimPage } from './types';

export type { SlimPage } from './types';

export interface DomainSummaryResponse extends Omit<DomainScanResult, 'pages'> {
    pages: SlimPage[];
    totalPageCount?: number;
    aggregated: {
        issues: ReturnType<typeof aggregateIssues>;
        ux: ReturnType<typeof aggregateUx>;
        seo: ReturnType<typeof aggregateSeo>;
        links: ReturnType<typeof aggregateLinks>;
        infra: ReturnType<typeof aggregateInfra>;
        eeatOnPage?: ReturnType<typeof aggregateEeatOnPage>;
        generative: ReturnType<typeof aggregateGenerative>;
        structure: ReturnType<typeof aggregateStructure>;
        performance: ReturnType<typeof aggregatePerformance>;
        eco: ReturnType<typeof aggregateEco>;
    };
}

/** Optional fields returned only by GET /api/scan/domain/[id]/summary (not stored in DB). */
export interface DomainSummaryApiMeta {
    /** True when `?light=1` omitted per-page SEO rows (`aggregated.seo.pages`) and capped other heavy arrays (see `toLightAggregated`). */
    seoPageRowsOmitted?: boolean;
    /** True when `?light=1` omitted `pages` (SlimPage[]); load via GET .../slim-pages. */
    slimPagesOmitted?: boolean;
}

export interface DomainSummaryApiResponse extends DomainSummaryResponse {
    summaryMeta?: DomainSummaryApiMeta;
}

/** True if payload has precomputed aggregated (new format). */
export function hasStoredAggregated(scan: DomainScanResult): scan is DomainScanResult & { aggregated: NonNullable<DomainScanResult['aggregated']> } {
    return scan.aggregated != null && typeof scan.aggregated === 'object';
}

/** True if pages are full ScanResult[] (legacy). */
function isFullPages(pages: DomainScanResult['pages']): pages is ScanResult[] {
    if (!pages?.length) return false;
    const first = pages[0] as Record<string, unknown>;
    return Array.isArray(first.issues) || first.pageIndex != null;
}

function toSlimPage(p: ScanResult): SlimPage {
    return {
        id: p.id,
        url: p.url,
        score: p.score,
        stats: p.stats ?? { errors: 0, warnings: 0, notices: 0 },
        ux: p.ux != null ? { score: p.ux.score } : undefined,
        eeatSignals: p.eeatSignals ?? undefined,
        hasPrivacy: p.privacy?.hasPrivacyPolicy ?? false,
        pageClassification: p.pageClassification ?? undefined,
    };
}

/** Build summary from stored payload (return as-is) or from legacy full pages. */
export function buildDomainSummary(scan: DomainScanResult): DomainSummaryResponse {
    if (hasStoredAggregated(scan) && !isFullPages(scan.pages)) {
        const pagesArr = (scan.pages as SlimPage[]) ?? [];
        const pageCount = pagesArr.length > 0 ? pagesArr.length : (scan.totalPages ?? 0);
        return {
            ...scan,
            pages: pagesArr,
            totalPageCount: pageCount,
            aggregated: scan.aggregated as DomainSummaryResponse['aggregated'],
        };
    }
    const pages = (scan.pages ?? []) as ScanResult[];
    const pageCount = pages.length > 0 ? pages.length : (scan.totalPages ?? 0);
    const aggregated = {
        issues: aggregateIssues(pages),
        ux: aggregateUx(pages),
        seo: aggregateSeo(pages),
        links: aggregateLinks(pages),
        infra: aggregateInfra(pages),
        eeatOnPage: aggregateEeatOnPage(pages),
        generative: aggregateGenerative(pages),
        structure: aggregateStructure(pages),
        performance: aggregatePerformance(pages),
        eco: aggregateEco(pages),
    };
    return {
        id: scan.id,
        domain: scan.domain,
        timestamp: scan.timestamp,
        status: scan.status,
        progress: scan.progress,
        totalPages: scan.totalPages,
        score: scan.score,
        graph: scan.graph,
        systemicIssues: scan.systemicIssues,
        eeat: scan.eeat,
        error: scan.error,
        llmSummary: scan.llmSummary,
        pages: pages.map(toSlimPage),
        totalPageCount: pageCount,
        aggregated,
    };
}

/**
 * Shrink API JSON: drop `aggregated.seo.pages` (often one row per scanned URL — largest array in summary).
 * Counts and other `aggregated.seo` fields stay intact for chips and copy.
 */
const LIGHT_META = { seoPageRowsOmitted: true as const, slimPagesOmitted: true as const };

/**
 * Shrink `aggregated` for `?light=1`: keeps counts/scores, caps per-page URL lists and UX link arrays.
 * Full lists load via `seoFull` merge or a non-light summary when needed.
 */
export function toLightAggregated(
    aggregated: DomainSummaryResponse['aggregated']
): DomainSummaryResponse['aggregated'] {
    return {
        ...aggregated,
        issues: aggregated.issues
            ? {
                  ...aggregated.issues,
                  issues: [],
                  pagesByIssueCount: [],
              }
            : aggregated.issues,
        ux: aggregated.ux
            ? {
                  ...aggregated.ux,
                  brokenLinks: (aggregated.ux.brokenLinks ?? []).slice(0, DOMAIN_LIGHT_SUMMARY_UX_BROKEN_LINKS_CAP),
                  pagesByScore: (aggregated.ux.pagesByScore ?? []).slice(0, DOMAIN_LIGHT_SUMMARY_UX_LIST_CAP),
                  consoleErrorsByPage: (aggregated.ux.consoleErrorsByPage ?? []).slice(
                      0,
                      DOMAIN_LIGHT_SUMMARY_UX_LIST_CAP
                  ),
                  focusOrderByPage: (aggregated.ux.focusOrderByPage ?? []).slice(0, DOMAIN_LIGHT_SUMMARY_UX_LIST_CAP),
                  tapTargets: {
                      ...aggregated.ux.tapTargets,
                      detailsByPage: (aggregated.ux.tapTargets?.detailsByPage ?? []).slice(
                          0,
                          DOMAIN_LIGHT_SUMMARY_UX_LIST_CAP
                      ),
                  },
              }
            : aggregated.ux,
        seo: aggregated.seo
            ? {
                  ...aggregated.seo,
                  pages: [],
                  missingMetaDescriptionUrls: (aggregated.seo.missingMetaDescriptionUrls ?? []).slice(
                      0,
                      DOMAIN_LIGHT_SUMMARY_SEO_URL_SAMPLE_CAP
                  ),
                  missingH1Urls: (aggregated.seo.missingH1Urls ?? []).slice(0, DOMAIN_LIGHT_SUMMARY_SEO_URL_SAMPLE_CAP),
                  missingCanonicalUrls: (aggregated.seo.missingCanonicalUrls ?? []).slice(
                      0,
                      DOMAIN_LIGHT_SUMMARY_SEO_URL_SAMPLE_CAP
                  ),
                  pagesWithNoindex: (aggregated.seo.pagesWithNoindex ?? []).slice(
                      0,
                      DOMAIN_LIGHT_SUMMARY_SEO_URL_SAMPLE_CAP
                  ),
                  crossPageKeywords: (aggregated.seo.crossPageKeywords ?? [])
                      .slice(0, DOMAIN_LIGHT_SUMMARY_SEO_KEYWORDS_CAP)
                      .map((kw) => ({
                          ...kw,
                          pageUrls: (kw.pageUrls ?? []).slice(0, DOMAIN_LIGHT_SUMMARY_SEO_URL_SAMPLE_CAP),
                      })),
              }
            : aggregated.seo,
        links: aggregated.links
            ? {
                  ...aggregated.links,
                  broken: (aggregated.links.broken ?? []).slice(0, DOMAIN_LIGHT_SUMMARY_LINKS_BROKEN_CAP),
                  brokenByPage: (aggregated.links.brokenByPage ?? []).slice(
                      0,
                      DOMAIN_LIGHT_SUMMARY_LINKS_BROKEN_BY_PAGE_CAP
                  ),
              }
            : aggregated.links,
        infra: aggregated.infra
            ? {
                  ...aggregated.infra,
                  privacy: aggregated.infra.privacy
                      ? {
                            ...aggregated.infra.privacy,
                            urlsWithPolicy: (aggregated.infra.privacy.urlsWithPolicy ?? []).slice(
                                0,
                                DOMAIN_LIGHT_SUMMARY_INFRA_URL_LIST_CAP
                            ),
                            urlsWithCookieBanner: (aggregated.infra.privacy.urlsWithCookieBanner ?? []).slice(
                                0,
                                DOMAIN_LIGHT_SUMMARY_INFRA_URL_LIST_CAP
                            ),
                            urlsWithTerms: (aggregated.infra.privacy.urlsWithTerms ?? []).slice(
                                0,
                                DOMAIN_LIGHT_SUMMARY_INFRA_URL_LIST_CAP
                            ),
                        }
                      : aggregated.infra.privacy,
                  security: aggregated.infra.security
                      ? {
                            ...aggregated.infra.security,
                            urlsWithCsp: (aggregated.infra.security.urlsWithCsp ?? []).slice(
                                0,
                                DOMAIN_LIGHT_SUMMARY_INFRA_URL_LIST_CAP
                            ),
                            urlsWithXFrame: (aggregated.infra.security.urlsWithXFrame ?? []).slice(
                                0,
                                DOMAIN_LIGHT_SUMMARY_INFRA_URL_LIST_CAP
                            ),
                        }
                      : aggregated.infra.security,
              }
            : aggregated.infra,
        generative: aggregated.generative
            ? {
                  ...aggregated.generative,
                  pages: (aggregated.generative.pages ?? []).slice(0, DOMAIN_LIGHT_SUMMARY_GENERATIVE_PAGES_CAP),
              }
            : aggregated.generative,
        structure: aggregated.structure
            ? {
                  ...aggregated.structure,
                  pagesWithMultipleH1: (aggregated.structure.pagesWithMultipleH1 ?? []).slice(
                      0,
                      DOMAIN_LIGHT_SUMMARY_STRUCTURE_URL_LIST_CAP
                  ),
                  pagesWithSkippedLevels: (aggregated.structure.pagesWithSkippedLevels ?? []).slice(
                      0,
                      DOMAIN_LIGHT_SUMMARY_STRUCTURE_URL_LIST_CAP
                  ),
                  pagesWithGoodStructure: (aggregated.structure.pagesWithGoodStructure ?? []).slice(
                      0,
                      DOMAIN_LIGHT_SUMMARY_STRUCTURE_URL_LIST_CAP
                  ),
              }
            : aggregated.structure,
    };
}

export function toLightDomainSummaryApiPayload(summary: DomainSummaryResponse): DomainSummaryApiResponse {
    return {
        ...summary,
        pages: [],
        aggregated: summary.aggregated ? toLightAggregated(summary.aggregated) : summary.aggregated,
        summaryMeta: LIGHT_META,
    };
}

/** Build the payload to store in domain_scans after deep scan (slim pages + precomputed aggregated). */
export function buildStoredDomainPayload(
    fullPages: ScanResult[],
    base: Pick<DomainScanResult, 'id' | 'domain' | 'timestamp' | 'status' | 'progress' | 'totalPages' | 'score' | 'graph' | 'systemicIssues' | 'eeat'>
): DomainScanResult {
    const aggregated = {
        issues: aggregateIssues(fullPages),
        ux: aggregateUx(fullPages),
        seo: aggregateSeo(fullPages),
        links: aggregateLinks(fullPages),
        infra: aggregateInfra(fullPages),
        eeatOnPage: aggregateEeatOnPage(fullPages),
        generative: aggregateGenerative(fullPages),
        structure: aggregateStructure(fullPages),
        performance: aggregatePerformance(fullPages),
        eco: aggregateEco(fullPages),
    };
    return {
        ...base,
        pages: fullPages.map(toSlimPage),
        aggregated,
    };
}
