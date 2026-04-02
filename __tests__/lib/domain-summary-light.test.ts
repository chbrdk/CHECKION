/**
 * Light domain summary API payload: omits per-page SEO rows to shrink JSON.
 */
import { toLightAggregated, toLightDomainSummaryApiPayload } from '@/lib/domain-summary';
import type { DomainSummaryResponse } from '@/lib/domain-summary';
import {
    DOMAIN_LIGHT_SUMMARY_UX_BROKEN_LINKS_CAP,
    DOMAIN_LIGHT_SUMMARY_UX_LIST_CAP,
} from '@/lib/constants';

describe('toLightDomainSummaryApiPayload', () => {
    it('sets summaryMeta and clears aggregated.seo.pages when seo exists', () => {
        const summary = {
            id: 'scan-1',
            domain: 'example.com',
            timestamp: 't',
            status: 'done' as const,
            progress: 100,
            totalPages: 2,
            score: 80,
            graph: { nodes: [], edges: [] },
            pages: [],
            aggregated: {
                issues: { stats: { errors: 0, warnings: 0, notices: 0 }, byType: [], byWcag: [] },
                ux: { avgScore: 0, pages: [] },
                seo: {
                    withTitle: 1,
                    withMetaDescription: 1,
                    withH1: 1,
                    withCanonical: 0,
                    withOgTitle: 0,
                    withOgImage: 0,
                    withOgDescription: 0,
                    withTwitterCard: 0,
                    missingMetaDescriptionUrls: [],
                    missingH1Urls: [],
                    missingCanonicalUrls: [],
                    pagesWithNoindex: [],
                    pages: [{ url: 'https://a.test/', wordCount: 400, densityPercent: 2 }],
                    crossPageKeywords: [],
                    totalWordsAcrossPages: 400,
                },
                links: { internal: 0, external: 0, broken: [] },
                infra: { https: true, mixedContent: [] },
                generative: { pages: [] },
                structure: { pages: [] },
                performance: { pages: [] },
                eco: { pages: [] },
            },
        } as unknown as DomainSummaryResponse;

        const light = toLightDomainSummaryApiPayload(summary);
        expect(light.summaryMeta).toEqual({ seoPageRowsOmitted: true, slimPagesOmitted: true });
        expect(light.pages).toEqual([]);
        expect(light.aggregated.seo.pages).toEqual([]);
        expect(light.aggregated.seo.withTitle).toBe(1);
    });

    it('still sets summaryMeta when aggregated.seo is missing', () => {
        const summary = {
            id: 's',
            domain: 'x',
            timestamp: 't',
            status: 'done' as const,
            progress: 1,
            totalPages: 0,
            score: 0,
            graph: { nodes: [], edges: [] },
            pages: [],
            aggregated: {
                issues: { stats: { errors: 0, warnings: 0, notices: 0 }, byType: [], byWcag: [] },
                ux: { avgScore: 0, pages: [] },
                links: { internal: 0, external: 0, broken: [] },
                infra: { https: true, mixedContent: [] },
                generative: { pages: [] },
                structure: { pages: [] },
                performance: { pages: [] },
                eco: { pages: [] },
            },
        } as unknown as DomainSummaryResponse;

        const light = toLightDomainSummaryApiPayload(summary);
        expect(light.summaryMeta).toEqual({ seoPageRowsOmitted: true, slimPagesOmitted: true });
        expect(light.pages).toEqual([]);
    });
});

describe('toLightAggregated', () => {
    it('empties issues pagesByIssueCount and caps UX per-page lists', () => {
        const urls = Array.from({ length: 50 }, (_, i) => `https://ex.test/p${i}`);
        const aggregated = {
            issues: {
                stats: { errors: 1, warnings: 0, notices: 0, total: 1 },
                issues: [],
                levelStats: { A: 0, AA: 0, AAA: 0, APCA: 0, Unknown: 0 },
                pagesByIssueCount: urls.map((url) => ({
                    url,
                    errors: 1,
                    warnings: 0,
                    notices: 0,
                })),
            },
            ux: {
                score: 50,
                cls: 0.1,
                readability: { grade: 'A', score: 80 },
                tapTargets: { issues: [], detailsByPage: urls.map((url) => ({ url, count: 2 })) },
                focusOrderByPage: urls.map((url) => ({ url, count: 1 })),
                brokenLinks: urls.map((pageUrl) => ({
                    href: 'x',
                    status: 404,
                    text: 't',
                    pageUrl,
                })),
                consoleErrorsByPage: urls.map((url) => ({ url, count: 1 })),
                headingHierarchy: { pagesWithMultipleH1: 0, pagesWithSkippedLevels: 0, totalPages: 50 },
                pageCount: 50,
                pagesByScore: urls.map((url) => ({ url, score: 50, cls: 0 })),
            },
            seo: null,
            links: null,
            infra: null,
            generative: null,
            structure: null,
            eeatOnPage: { withImpressum: 0, withPrivacy: 0, totalPages: 0 },
            performance: null,
            eco: null,
        } as unknown as DomainSummaryResponse['aggregated'];

        const light = toLightAggregated(aggregated);
        expect(light.issues?.pagesByIssueCount).toEqual([]);
        expect(light.ux?.pagesByScore).toHaveLength(DOMAIN_LIGHT_SUMMARY_UX_LIST_CAP);
        expect(light.ux?.tapTargets.detailsByPage).toHaveLength(DOMAIN_LIGHT_SUMMARY_UX_LIST_CAP);
        expect(light.ux?.brokenLinks).toHaveLength(DOMAIN_LIGHT_SUMMARY_UX_BROKEN_LINKS_CAP);
    });
});
