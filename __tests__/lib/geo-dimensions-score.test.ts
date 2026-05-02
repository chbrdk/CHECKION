import { describe, it, expect } from 'vitest';
import { computeGeoDimensionsScore } from '@/lib/geo-dimensions-score';

const baseRepurposing = {
    hasFaqPageSchema: true,
    hasHowToSchema: true,
    faqMainEntityCount: 3,
    howToStepCount: 4,
    hasBreadcrumbList: true,
    organizationOrWebSiteWithTrust: true,
    hasSameAsOrLogo: true,
    headingH2Count: 4,
    headingH3Count: 2,
    hasSingleH1: true,
    mainContentWordRatio: 0.5,
    definitionListPairCount: 2,
};

describe('computeGeoDimensionsScore', () => {
    it('produces strong discoverability when crawl signals are positive', () => {
        const r = computeGeoDimensionsScore({
            hasRobotsAllowingAI: true,
            hasLlmsTxt: true,
            metaRobotsIndexable: true,
            recommendedSchemaTypesFound: ['Article', 'FAQPage'],
            robotsTxtPresent: true,
            sitemapUrlPresent: true,
            jsonLdErrors: [],
            llmsTxtRobotsConsistencyWarnings: [],
            repurposing: { ...baseRepurposing },
            tableCount: 2,
            faqDomCount: 2,
            listDensity: 0.1,
            citationCount: 8,
            citationsWithLinks: 2,
            hasAuthorBio: true,
            articleSchemaQuality: { hasDatePublished: true, hasDateModified: true, hasAuthor: true },
            structuredDataRequiredFields: [],
            jsonLdRichResultGaps: [],
            eeat: {
                hasImpressum: true,
                hasContact: true,
                hasAboutLink: true,
                hasTeamLink: true,
                hasCaseStudyMention: false,
            },
            isYmyl: false,
        });
        expect(r.dimensions.discoverability).toBeGreaterThanOrEqual(85);
        expect(r.dimensions.repurposing).toBeGreaterThanOrEqual(70);
        expect(r.score).toBeGreaterThanOrEqual(70);
        expect(r.dimensionBreakdown.discoverability.length).toBeGreaterThan(0);
        expect(r.dimensionBreakdown.repurposing.length).toBeGreaterThan(0);
    });

    it('penalizes discoverability when AI bots are blocked', () => {
        const r = computeGeoDimensionsScore({
            hasRobotsAllowingAI: false,
            hasLlmsTxt: false,
            metaRobotsIndexable: true,
            recommendedSchemaTypesFound: [],
            robotsTxtPresent: false,
            sitemapUrlPresent: false,
            jsonLdErrors: ['err'],
            llmsTxtRobotsConsistencyWarnings: ['warn'],
            repurposing: { ...baseRepurposing, hasFaqPageSchema: false, hasHowToSchema: false },
            tableCount: 0,
            faqDomCount: 0,
            listDensity: 0,
            citationCount: 0,
            citationsWithLinks: 0,
            hasAuthorBio: false,
            structuredDataRequiredFields: [{ type: 'FAQPage', missing: ['mainEntity'] }],
            jsonLdRichResultGaps: [],
            isYmyl: false,
        });
        expect(r.dimensions.discoverability).toBeLessThan(50);
        expect(r.discoverabilitySignals?.jsonLdErrorCount).toBe(1);
        expect(r.discoverabilitySignals?.llmsRobotsWarningCount).toBe(1);
    });

    it('applies YMYL penalty when citations and author are weak', () => {
        const withYmyl = computeGeoDimensionsScore({
            hasRobotsAllowingAI: true,
            hasLlmsTxt: true,
            metaRobotsIndexable: true,
            recommendedSchemaTypesFound: ['WebPage'],
            robotsTxtPresent: true,
            sitemapUrlPresent: true,
            jsonLdErrors: [],
            llmsTxtRobotsConsistencyWarnings: [],
            repurposing: { ...baseRepurposing },
            tableCount: 1,
            faqDomCount: 1,
            listDensity: 0.05,
            citationCount: 1,
            citationsWithLinks: 0,
            hasAuthorBio: false,
            structuredDataRequiredFields: [],
            jsonLdRichResultGaps: [],
            isYmyl: true,
        });
        const noYmyl = computeGeoDimensionsScore({
            hasRobotsAllowingAI: true,
            hasLlmsTxt: true,
            metaRobotsIndexable: true,
            recommendedSchemaTypesFound: ['WebPage'],
            robotsTxtPresent: true,
            sitemapUrlPresent: true,
            jsonLdErrors: [],
            llmsTxtRobotsConsistencyWarnings: [],
            repurposing: { ...baseRepurposing },
            tableCount: 1,
            faqDomCount: 1,
            listDensity: 0.05,
            citationCount: 1,
            citationsWithLinks: 0,
            hasAuthorBio: false,
            structuredDataRequiredFields: [],
            jsonLdRichResultGaps: [],
            isYmyl: false,
        });
        expect(withYmyl.dimensions.repurposing).toBeLessThanOrEqual(noYmyl.dimensions.repurposing);
    });
});
