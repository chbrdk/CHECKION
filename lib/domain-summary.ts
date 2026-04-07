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
    aggregatePageClassification,
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
    DOMAIN_LIGHT_SUMMARY_PAGE_CLASSIFICATION_PAGE_SAMPLES_CAP,
    DOMAIN_LIGHT_SUMMARY_PAGE_CLASSIFICATION_TOP_THEMES_CAP,
    DOMAIN_STORED_SUMMARY_GENERATIVE_PAGES_CAP,
    DOMAIN_STORED_SUMMARY_INFRA_URL_LIST_CAP,
    DOMAIN_STORED_SUMMARY_LINKS_BROKEN_BY_PAGE_CAP,
    DOMAIN_STORED_SUMMARY_LINKS_BROKEN_CAP,
    DOMAIN_STORED_SUMMARY_SEO_KEYWORDS_CAP,
    DOMAIN_STORED_SUMMARY_SEO_URL_SAMPLE_CAP,
    DOMAIN_STORED_SUMMARY_STRUCTURE_URL_LIST_CAP,
    DOMAIN_STORED_SUMMARY_UX_BROKEN_LINKS_CAP,
    DOMAIN_STORED_SUMMARY_UX_LIST_CAP,
    DOMAIN_STORED_SUMMARY_PAGE_CLASSIFICATION_PAGE_SAMPLES_CAP,
    DOMAIN_STORED_SUMMARY_PAGE_CLASSIFICATION_TOP_THEMES_CAP,
} from './constants';
import type { ScanResult, DomainScanResult, SlimPage, AggregatedPageClassification } from './types';

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
        /** Rollup of per-page LLM tagTiers; absent on older stored payloads. */
        pageClassification?: AggregatedPageClassification | null;
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
    /** Present on GET .../bundle and some summary responses. */
    totalSlimRows?: number;
    projectId?: string | null;
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
    const pageClassification = aggregatePageClassification(pages);
    const aggregated: DomainSummaryResponse['aggregated'] = {
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
        ...(pageClassification ? { pageClassification } : {}),
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

type AggregatedCaps = {
    uxList: number;
    uxBrokenLinks: number;
    seoUrlSample: number;
    seoKeywords: number;
    linksBroken: number;
    linksBrokenByPage: number;
    infraUrlList: number;
    generativePages: number;
    structureUrlList: number;
    pageClassTopThemes: number;
    pageClassPageSamples: number;
};

const LIGHT_AGG_CAPS: AggregatedCaps = {
    uxList: DOMAIN_LIGHT_SUMMARY_UX_LIST_CAP,
    uxBrokenLinks: DOMAIN_LIGHT_SUMMARY_UX_BROKEN_LINKS_CAP,
    seoUrlSample: DOMAIN_LIGHT_SUMMARY_SEO_URL_SAMPLE_CAP,
    seoKeywords: DOMAIN_LIGHT_SUMMARY_SEO_KEYWORDS_CAP,
    linksBroken: DOMAIN_LIGHT_SUMMARY_LINKS_BROKEN_CAP,
    linksBrokenByPage: DOMAIN_LIGHT_SUMMARY_LINKS_BROKEN_BY_PAGE_CAP,
    infraUrlList: DOMAIN_LIGHT_SUMMARY_INFRA_URL_LIST_CAP,
    generativePages: DOMAIN_LIGHT_SUMMARY_GENERATIVE_PAGES_CAP,
    structureUrlList: DOMAIN_LIGHT_SUMMARY_STRUCTURE_URL_LIST_CAP,
    pageClassTopThemes: DOMAIN_LIGHT_SUMMARY_PAGE_CLASSIFICATION_TOP_THEMES_CAP,
    pageClassPageSamples: DOMAIN_LIGHT_SUMMARY_PAGE_CLASSIFICATION_PAGE_SAMPLES_CAP,
};

const STORED_AGG_CAPS: AggregatedCaps = {
    uxList: DOMAIN_STORED_SUMMARY_UX_LIST_CAP,
    uxBrokenLinks: DOMAIN_STORED_SUMMARY_UX_BROKEN_LINKS_CAP,
    seoUrlSample: DOMAIN_STORED_SUMMARY_SEO_URL_SAMPLE_CAP,
    seoKeywords: DOMAIN_STORED_SUMMARY_SEO_KEYWORDS_CAP,
    linksBroken: DOMAIN_STORED_SUMMARY_LINKS_BROKEN_CAP,
    linksBrokenByPage: DOMAIN_STORED_SUMMARY_LINKS_BROKEN_BY_PAGE_CAP,
    infraUrlList: DOMAIN_STORED_SUMMARY_INFRA_URL_LIST_CAP,
    generativePages: DOMAIN_STORED_SUMMARY_GENERATIVE_PAGES_CAP,
    structureUrlList: DOMAIN_STORED_SUMMARY_STRUCTURE_URL_LIST_CAP,
    pageClassTopThemes: DOMAIN_STORED_SUMMARY_PAGE_CLASSIFICATION_TOP_THEMES_CAP,
    pageClassPageSamples: DOMAIN_STORED_SUMMARY_PAGE_CLASSIFICATION_PAGE_SAMPLES_CAP,
};

/**
 * Shrink `aggregated` — shared by `?light=1` API and persisted `domain_scans.payload`.
 * Keeps counts/scores; caps URL-heavy arrays. Full lists: `seoFull`, non-light summary, or `scans` / domain APIs.
 */
function capAggregatedForSize(
    aggregated: DomainSummaryResponse['aggregated'],
    c: AggregatedCaps
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
                  readability: aggregated.ux.readability
                      ? {
                            ...aggregated.ux.readability,
                            hardestPages: (aggregated.ux.readability.hardestPages ?? []).slice(0, c.uxList),
                        }
                      : aggregated.ux.readability,
                  brokenLinks: (aggregated.ux.brokenLinks ?? []).slice(0, c.uxBrokenLinks),
                  pagesByScore: (aggregated.ux.pagesByScore ?? []).slice(0, c.uxList),
                  consoleErrorsByPage: (aggregated.ux.consoleErrorsByPage ?? []).slice(0, c.uxList),
                  focusOrderByPage: (aggregated.ux.focusOrderByPage ?? []).slice(0, c.uxList),
                  tapTargets: {
                      ...aggregated.ux.tapTargets,
                      detailsByPage: (aggregated.ux.tapTargets?.detailsByPage ?? []).slice(0, c.uxList),
                  },
              }
            : aggregated.ux,
        seo: aggregated.seo
            ? {
                  ...aggregated.seo,
                  pages: [],
                  missingMetaDescriptionUrls: (aggregated.seo.missingMetaDescriptionUrls ?? []).slice(
                      0,
                      c.seoUrlSample
                  ),
                  missingH1Urls: (aggregated.seo.missingH1Urls ?? []).slice(0, c.seoUrlSample),
                  missingCanonicalUrls: (aggregated.seo.missingCanonicalUrls ?? []).slice(0, c.seoUrlSample),
                  pagesWithNoindex: (aggregated.seo.pagesWithNoindex ?? []).slice(0, c.seoUrlSample),
                  crossPageKeywords: (aggregated.seo.crossPageKeywords ?? [])
                      .slice(0, c.seoKeywords)
                      .map((kw) => ({
                          ...kw,
                          pageUrls: (kw.pageUrls ?? []).slice(0, c.seoUrlSample),
                      })),
              }
            : aggregated.seo,
        links: aggregated.links
            ? {
                  ...aggregated.links,
                  broken: (aggregated.links.broken ?? []).slice(0, c.linksBroken),
                  brokenByPage: (aggregated.links.brokenByPage ?? []).slice(0, c.linksBrokenByPage),
              }
            : aggregated.links,
        infra: aggregated.infra
            ? {
                  ...aggregated.infra,
                  privacy: aggregated.infra.privacy
                      ? {
                            ...aggregated.infra.privacy,
                            urlsWithPolicy: (aggregated.infra.privacy.urlsWithPolicy ?? []).slice(0, c.infraUrlList),
                            urlsWithCookieBanner: (aggregated.infra.privacy.urlsWithCookieBanner ?? []).slice(
                                0,
                                c.infraUrlList
                            ),
                            urlsWithTerms: (aggregated.infra.privacy.urlsWithTerms ?? []).slice(0, c.infraUrlList),
                        }
                      : aggregated.infra.privacy,
                  security: aggregated.infra.security
                      ? {
                            ...aggregated.infra.security,
                            urlsWithCsp: (aggregated.infra.security.urlsWithCsp ?? []).slice(0, c.infraUrlList),
                            urlsWithXFrame: (aggregated.infra.security.urlsWithXFrame ?? []).slice(0, c.infraUrlList),
                        }
                      : aggregated.infra.security,
              }
            : aggregated.infra,
        generative: aggregated.generative
            ? {
                  ...aggregated.generative,
                  pages: (aggregated.generative.pages ?? []).slice(0, c.generativePages),
              }
            : aggregated.generative,
        structure: aggregated.structure
            ? {
                  ...aggregated.structure,
                  pagesWithMultipleH1: (aggregated.structure.pagesWithMultipleH1 ?? []).slice(0, c.structureUrlList),
                  pagesWithSkippedLevels: (aggregated.structure.pagesWithSkippedLevels ?? []).slice(
                      0,
                      c.structureUrlList
                  ),
                  pagesWithGoodStructure: (aggregated.structure.pagesWithGoodStructure ?? []).slice(
                      0,
                      c.structureUrlList
                  ),
              }
            : aggregated.structure,
        pageClassification: aggregated.pageClassification
            ? {
                  ...aggregated.pageClassification,
                  topThemes: (aggregated.pageClassification.topThemes ?? []).slice(0, c.pageClassTopThemes),
                  pageSamples: (aggregated.pageClassification.pageSamples ?? []).slice(0, c.pageClassPageSamples),
              }
            : aggregated.pageClassification,
    };
}

/** Shrink `aggregated` for `?light=1`: keeps counts/scores, caps per-page URL lists and UX link arrays. */
export function toLightAggregated(
    aggregated: DomainSummaryResponse['aggregated']
): DomainSummaryResponse['aggregated'] {
    return capAggregatedForSize(aggregated, LIGHT_AGG_CAPS);
}

/** Shrink `aggregated` for persistence in `domain_scans.payload` (same rules as light; separate caps in constants). */
export function toStoredAggregated(
    aggregated: DomainSummaryResponse['aggregated']
): DomainSummaryResponse['aggregated'] {
    return capAggregatedForSize(aggregated, STORED_AGG_CAPS);
}

export function toLightDomainSummaryApiPayload(summary: DomainSummaryResponse): DomainSummaryApiResponse {
    return {
        ...summary,
        pages: [],
        aggregated: summary.aggregated ? toLightAggregated(summary.aggregated) : summary.aggregated,
        summaryMeta: LIGHT_META,
    };
}

export type BuildStoredDomainPayloadOptions = {
    /**
     * When true, persist `pages: []` and rely on `domain_pages` + `/slim-pages` (after successful issue persist).
     * `totalPages` on `base` must still reflect page count for summary/list UIs.
     */
    omitSlimPages?: boolean;
};

/** Build the payload to store in domain_scans after deep scan (slim pages + precomputed aggregated). */
export function buildStoredDomainPayload(
    fullPages: ScanResult[],
    base: Pick<DomainScanResult, 'id' | 'domain' | 'timestamp' | 'status' | 'progress' | 'totalPages' | 'score' | 'graph' | 'systemicIssues' | 'eeat'>,
    options?: BuildStoredDomainPayloadOptions
): DomainScanResult {
    const pageClassification = aggregatePageClassification(fullPages);
    const aggregatedRaw: DomainSummaryResponse['aggregated'] = {
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
        ...(pageClassification ? { pageClassification } : {}),
    };
    const aggregated = toStoredAggregated(aggregatedRaw);
    const pages = options?.omitSlimPages ? [] : fullPages.map(toSlimPage);
    return {
        ...base,
        pages,
        aggregated,
    };
}
