import { describe, it, expect } from 'vitest';
import {
    buildProjectSetupContext,
    slimProjectSetupForAgent,
} from '@/lib/project-report/project-setup-context';

describe('buildProjectSetupContext', () => {
    it('detects keywords suggested by research but not tracked', () => {
        const setup = buildProjectSetupContext({
            valueProposition: 'Test VP',
            industry: 'insurance',
            tags: [],
            competitors: ['rival.de'],
            geoQueries: ['beste haftpflicht'],
            geoQueriesByMarket: {},
            researchSnapshot: {
                targetGroups: ['Makler', 'Privatkunden'],
                valueProposition: 'Test VP',
                seoKeywords: ['haftpflicht vergleich', 'kfz versicherung'],
                seoKeywordsByMarket: null,
                geoQueries: ['beste haftpflicht', 'günstige haftpflicht'],
                geoQueriesByMarket: null,
                competitors: ['rival.de'],
                marketKeys: null,
            },
            researchCapturedAt: '2026-06-01T00:00:00.000Z',
            rankings: {
                score: 50,
                keywordCount: 1,
                lastUpdated: null,
                competitorScores: {},
                topKeywords: [
                    {
                        id: 'k1',
                        keyword: 'haftpflicht vergleich',
                        position: 12,
                        evidenceId: 'ev-k1',
                    },
                ],
                evidenceId: 'ev-ranking',
            },
        });

        expect(setup.available).toBe(true);
        expect(setup.targetGroups).toEqual(['Makler', 'Privatkunden']);
        expect(setup.gaps.untrackedSuggestedKeywords).toContain('kfz versicherung');
        expect(setup.gaps.missingGeoQueries).toContain('günstige haftpflicht');
        expect(setup.gaps.noRankTracking).toBe(false);
    });

    it('returns null slim payload when nothing configured', () => {
        const setup = buildProjectSetupContext({
            valueProposition: null,
            industry: null,
            tags: [],
            competitors: [],
            geoQueries: [],
            geoQueriesByMarket: {},
            researchSnapshot: null,
            researchCapturedAt: null,
            rankings: null,
        });
        expect(setup.available).toBe(false);
        expect(slimProjectSetupForAgent(setup)).toBeNull();
    });

    it('includes value proposition and gaps in slim agent payload', () => {
        const setup = buildProjectSetupContext({
            valueProposition: 'Digital first insurer',
            industry: 'insurance',
            tags: ['b2c'],
            competitors: [],
            geoQueries: [],
            geoQueriesByMarket: {},
            researchSnapshot: {
                targetGroups: ['Young drivers'],
                valueProposition: null,
                seoKeywords: ['auto insurance'],
                seoKeywordsByMarket: null,
                geoQueries: ['cheapest car insurance'],
                geoQueriesByMarket: null,
                competitors: [],
                marketKeys: null,
            },
            researchCapturedAt: null,
            rankings: null,
        });
        const slim = slimProjectSetupForAgent(setup);
        expect(slim).toMatchObject({
            valueProposition: 'Digital first insurer',
            industry: 'insurance',
            keywordsNotYetTracked: ['auto insurance'],
            geoQueriesNotYetConfigured: ['cheapest car insurance'],
        });
    });
});
