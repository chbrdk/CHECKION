/**
 * Tests for GEO deep analysis builder.
 */
import { describe, it, expect } from 'vitest';
import { buildGeoDeepAnalysis } from '@/lib/project-report/geo-deep-analysis';
import type { GeoEeatIntensiveResult } from '@/lib/types';

const payload: GeoEeatIntensiveResult = {
    pages: [
        {
            url: 'https://example.com/',
            title: 'Home',
            geoFitnessScore: 42,
            geoFitnessReasoning: 'Missing structured data.',
            eeatScores: {
                trust: { score: 2, reasoning: 'Low trust signals' },
                experience: { score: 3, reasoning: 'OK' },
                expertise: { score: 4, reasoning: 'Good' },
            },
            missingGeoElements: ['faq schema'],
            technical: { hasPrivacy: true, hasImpressum: false },
        },
    ],
    recommendations: [],
    competitiveByModel: {
        'gpt-5.4-nano': {
            queries: ['best product'],
            competitors: ['rival.com'],
            runs: [
                {
                    queryId: 'q1',
                    query: 'best product',
                    provider: 'openai',
                    citations: [
                        { domain: 'rival.com', position: 1 },
                        { domain: 'example.com', position: 2 },
                    ],
                },
            ],
            metrics: [
                {
                    domain: 'example.com',
                    shareOfVoice: 0.35,
                    avgPosition: 2,
                    queryCount: 1,
                    mentionCount: 1,
                },
            ],
        },
    },
};

describe('buildGeoDeepAnalysis', () => {
    it('builds model benchmarks and question details', () => {
        const deep = buildGeoDeepAnalysis(payload, 'example.com', []);
        expect(deep).not.toBeNull();
        expect(deep!.modelBenchmarks.length).toBe(1);
        expect(deep!.questionDetails.length).toBe(1);
        expect(deep!.questionDetails[0]!.positionsByModel[0]?.cited).toBe(true);
        expect(deep!.pages.length).toBe(1);
        expect(deep!.deterministicInsights.length).toBeGreaterThan(0);
    });

    it('returns null when no data', () => {
        expect(buildGeoDeepAnalysis(null, '', [])).toBeNull();
    });
});
