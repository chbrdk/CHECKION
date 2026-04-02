/**
 * GET /api/scan/domain/[id]/summary?light=1 — route applies real toLightDomainSummaryApiPayload (capped aggregated JSON).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));
vi.mock('@/lib/db/scans', () => ({
    getDomainScanWithProjectId: vi.fn(),
}));
vi.mock('@/lib/domain-summary', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/domain-summary')>();
    return {
        ...actual,
        buildDomainSummary: vi.fn(),
    };
});

import { getRequestUser } from '@/lib/auth-api-token';
import { getDomainScanWithProjectId } from '@/lib/db/scans';
import { buildDomainSummary } from '@/lib/domain-summary';
import type { DomainSummaryResponse } from '@/lib/domain-summary';
import { GET } from '@/app/api/scan/domain/[id]/summary/route';
import { HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } from '@/lib/constants';
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
} from '@/lib/constants';

function makeHugeDomainSummary(): DomainSummaryResponse {
    const n = 100;
    const urls = Array.from({ length: n }, (_, i) => `https://ex.test/p/${i}`);
    return {
        id: 'scan-1',
        domain: 'ex.test',
        timestamp: '2020-01-01T00:00:00Z',
        status: 'done',
        progress: 100,
        totalPages: n,
        score: 70,
        graph: { nodes: [], edges: [] },
        pages: urls.map((url, i) => ({
            id: `page-${i}`,
            url,
            score: 70,
            stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
        })),
        totalPageCount: n,
        aggregated: {
            issues: {
                stats: { errors: 10, warnings: 0, notices: 0, total: 10 },
                levelStats: { A: 0, AA: 0, AAA: 0, APCA: 0, Unknown: 0 },
                issues: [{ code: 'x', type: 'error', message: 'm' } as any],
                pagesByIssueCount: urls.map((url) => ({ url, errors: 1, warnings: 0, notices: 0 })),
            },
            ux: {
                score: 70,
                cls: 0,
                readability: { grade: 'A', score: 80 },
                tapTargets: { issues: [], detailsByPage: urls.map((url) => ({ url, count: 1 })) },
                focusOrderByPage: urls.map((url) => ({ url, count: 1 })),
                brokenLinks: urls.map((pageUrl) => ({
                    href: '/broken',
                    status: 404,
                    text: 'x',
                    pageUrl,
                })),
                consoleErrorsByPage: urls.map((url) => ({ url, count: 1 })),
                headingHierarchy: { pagesWithMultipleH1: 0, pagesWithSkippedLevels: 0, totalPages: n },
                pageCount: n,
                pagesByScore: urls.map((url) => ({ url, score: 70, cls: 0 })),
            },
            seo: {
                totalPages: n,
                withTitle: n,
                withMetaDescription: 0,
                withH1: n,
                withCanonical: n,
                missingMetaDescriptionUrls: urls,
                missingH1Urls: urls,
                missingCanonicalUrls: urls,
                pagesWithNoindex: urls,
                withOgTitle: 0,
                withOgImage: 0,
                withOgDescription: 0,
                withTwitterCard: 0,
                pages: urls.map((url) => ({
                    url,
                    title: null,
                    hasMeta: false,
                    hasH1: true,
                    wordCount: 100,
                    topKeywordCount: 0,
                    isSkinny: false,
                })),
                crossPageKeywords: Array.from({ length: 40 }, (_, i) => ({
                    keyword: `kw${i}`,
                    totalCount: 10,
                    pageCount: 5,
                    avgDensityPercent: 1,
                    pageUrls: urls.slice(0, 10),
                })),
                totalWordsAcrossPages: 10_000,
            },
            links: {
                broken: Array.from({ length: 120 }, (_, i) => ({
                    url: `https://broken/${i}`,
                    status: 404,
                    text: 't',
                    pageUrl: urls[i % urls.length]!,
                })),
                totalLinks: 1000,
                internal: 500,
                external: 500,
                uniqueBrokenUrls: 120,
                brokenByPage: urls.map((url) => ({ url, count: 2 })),
            },
            infra: {
                geo: { pageCount: 1, sample: null },
                privacy: {
                    withPolicy: 1,
                    withCookieBanner: 0,
                    withTerms: 0,
                    totalPages: n,
                    urlsWithPolicy: urls,
                    urlsWithCookieBanner: urls,
                    urlsWithTerms: urls,
                },
                security: {
                    withCsp: 0,
                    withXFrame: 0,
                    totalPages: n,
                    urlsWithCsp: urls,
                    urlsWithXFrame: urls,
                },
                technical: null,
                technicalCounts: null,
            },
            eeatOnPage: {
                withImpressum: 0,
                withPrivacy: 0,
                withContact: 0,
                withAboutLink: 0,
                withTeamLink: 0,
                withCaseStudyMention: 0,
                totalPages: n,
            },
            generative: {
                score: 50,
                pageCount: n,
                withLlmsTxt: 0,
                withRobotsAllowingAi: 0,
                contentSummary: { avgFaqCount: 0, avgListDensity: 0, avgCitationDensity: 0 },
                pages: urls.map((url) => ({
                    url,
                    score: 50,
                    hasLlmsTxt: false,
                    hasRecommendedSchema: false,
                })),
            },
            structure: {
                pagesWithHeadingIssues: 0,
                pagesWithMultipleH1: urls,
                pagesWithSkippedLevels: urls,
                pagesWithGoodStructure: urls,
                totalPages: n,
            },
            performance: {
                avgTtfb: 0,
                avgFcp: 0,
                avgLcp: 0,
                avgDomLoad: 0,
                pageCount: n,
            },
            eco: {
                avgCo2: 0,
                totalPageWeight: 0,
                gradeDistribution: {},
                pageCount: n,
            },
        },
    } as unknown as DomainSummaryResponse;
}

describe('GET /api/scan/domain/[id]/summary?light=1', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(getDomainScanWithProjectId).mockReset();
        vi.mocked(buildDomainSummary).mockReset();
    });

    it('returns 401 when unauthenticated', async () => {
        vi.mocked(getRequestUser).mockResolvedValue(null);
        const req = new Request('http://localhost/api/scan/domain/d1/summary?light=1');
        const res = await GET(req, { params: Promise.resolve({ id: 'd1' }) });
        expect(res.status).toBe(401);
    });

    it('applies light payload: empty top-level pages, summaryMeta, capped aggregated arrays', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' });
        vi.mocked(getDomainScanWithProjectId).mockResolvedValue({
            result: { pages: [] },
            projectId: 'proj-1',
        } as any);
        vi.mocked(buildDomainSummary).mockReturnValue(makeHugeDomainSummary());

        const req = new Request('http://localhost/api/scan/domain/d1/summary?light=1');
        const res = await GET(req, { params: Promise.resolve({ id: 'd1' }) });
        expect(res.status).toBe(200);
        expect(res.headers.get('Cache-Control')).toBe(HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON);
        const body = await res.json();

        expect(body.projectId).toBe('proj-1');
        expect(body.summaryMeta).toEqual({ seoPageRowsOmitted: true, slimPagesOmitted: true });
        expect(body.pages).toEqual([]);

        expect(body.aggregated.issues.issues).toEqual([]);
        expect(body.aggregated.issues.pagesByIssueCount).toEqual([]);

        expect(body.aggregated.ux.pagesByScore).toHaveLength(DOMAIN_LIGHT_SUMMARY_UX_LIST_CAP);
        expect(body.aggregated.ux.tapTargets.detailsByPage).toHaveLength(DOMAIN_LIGHT_SUMMARY_UX_LIST_CAP);
        expect(body.aggregated.ux.brokenLinks).toHaveLength(DOMAIN_LIGHT_SUMMARY_UX_BROKEN_LINKS_CAP);

        expect(body.aggregated.seo.pages).toEqual([]);
        expect(body.aggregated.seo.missingMetaDescriptionUrls).toHaveLength(DOMAIN_LIGHT_SUMMARY_SEO_URL_SAMPLE_CAP);
        expect(body.aggregated.seo.crossPageKeywords).toHaveLength(DOMAIN_LIGHT_SUMMARY_SEO_KEYWORDS_CAP);

        expect(body.aggregated.links.broken).toHaveLength(DOMAIN_LIGHT_SUMMARY_LINKS_BROKEN_CAP);
        expect(body.aggregated.links.brokenByPage).toHaveLength(DOMAIN_LIGHT_SUMMARY_LINKS_BROKEN_BY_PAGE_CAP);

        expect(body.aggregated.infra.privacy.urlsWithPolicy).toHaveLength(DOMAIN_LIGHT_SUMMARY_INFRA_URL_LIST_CAP);
        expect(body.aggregated.infra.security.urlsWithCsp).toHaveLength(DOMAIN_LIGHT_SUMMARY_INFRA_URL_LIST_CAP);

        expect(body.aggregated.generative.pages).toHaveLength(DOMAIN_LIGHT_SUMMARY_GENERATIVE_PAGES_CAP);

        expect(body.aggregated.structure.pagesWithMultipleH1).toHaveLength(
            DOMAIN_LIGHT_SUMMARY_STRUCTURE_URL_LIST_CAP
        );

        expect(body.aggregated.seo.withMetaDescription).toBe(0);
        expect(body.aggregated.seo.totalPages).toBe(100);
    });
});
