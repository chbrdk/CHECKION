/**
 * Light domain summary API payload: omits per-page SEO rows to shrink JSON.
 */
import { toLightDomainSummaryApiPayload } from '@/lib/domain-summary';
import type { DomainSummaryResponse } from '@/lib/domain-summary';

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
