import { describe, it, expect } from 'vitest';
import {
    buildFallbackGeoInterpretations,
    resolveGeoInterpretations,
} from '@/lib/project-report/geo-interpretations';
import { emptyProjectSetupContext } from '@/lib/project-report/project-setup-context';
import { emptyEchonMarketContext } from '@/lib/project-report/echon-market-context';
import type { GeoFacts } from '@/lib/project-report/types';

const geo: GeoFacts = {
    score: 64,
    runId: 'g1',
    runUrl: 'https://example.com',
    runCreatedAt: null,
    status: 'complete',
    recommendations: [{ title: 'FAQ ergänzen', description: 'Strukturierte Antworten für GEO.' }],
    competitiveDomains: [
        { domain: 'example.com', shareOfVoice: 0.28, avgPosition: 2.1, score: 64, evidenceId: 'ev-1' },
        { domain: 'competitor-a.de', shareOfVoice: 0.35, avgPosition: 1.4, score: 78, evidenceId: 'ev-2' },
    ],
    competitorScores: {},
    evidenceId: 'ev-geo',
};

const geoDeep = {
    modelBenchmarks: [
        {
            modelId: 'GPT 5',
            shareOfVoice: 0.32,
            avgPosition: 2.4,
            mentionCount: 18,
            queryCount: 24,
            visibilityScore: 72,
            evidenceId: 'ev-m',
        },
    ],
    questionDetails: [],
    pages: [],
    deterministicInsights: [
        {
            id: 'i1',
            kind: 'question' as const,
            title: 'Kernfrage ohne Zitation',
            description: 'Bei 40% der GEO-Fragen fehlt eine Zitation.',
            evidenceId: 'ev-i',
        },
    ],
    summary: {
        modelCount: 1,
        questionCount: 2,
        pageCount: 1,
        avgGeoFitness: 71,
        avgTrust: 4,
        questionsNotCited: 1,
        pagesBelowGeoThreshold: 0,
    },
};

describe('geo-interpretations', () => {
    it('builds German fallback texts for GEO metrics', () => {
        const t = buildFallbackGeoInterpretations(geo, geoDeep, 'de');
        expect(t.geoScore).toContain('64');
        expect(t.llmVisibility).toContain('LLM');
        expect(t.geoQuestions).toContain('2');
        expect(t.geoInsights).toContain('1');
    });

    it('prefers agent metricInterpretations over fallback', () => {
        const text = resolveGeoInterpretations({
            version: '1.0',
            generatedAt: '',
            locale: 'de',
            variant: 'comprehensive',
            project: {
                id: 'p',
                name: 'P',
                domain: 'example.com',
                industry: null,
                valueProposition: null,
                tags: [],
                competitors: [],
                counts: {
                    domainScans: 1,
                    journeyRuns: 0,
                    geoEeatRuns: 1,
                    singleScans: 0,
                    rankTrackingKeywords: 0,
                },
            },
            domain: null,
            competitors: [],
            rankings: null,
            geo,
            rankTrends: [],
            journey: null,
            visuals: [],
            narrative: null,
            deep: {
                metrics: [],
                sections: {
                    siteQuality: null,
                    seoRankings: null,
                    geo: {
                        title: 'GEO',
                        summary: 'Summary',
                        keyFindings: [],
                        metricsHighlighted: [],
                        metricInterpretations: {
                            geoScore: 'Agent GEO text',
                        },
                    },
                    competitive: null,
                    journey: null,
                },
                geoQuestionHistory: [],
                geoPages: [],
                geoDeep,
                rankKeywordDetails: [],
                issueGroups: [],
                seoRollup: null,
                competitiveBenchmark: null,
            },
            audience: null,
    setup: emptyProjectSetupContext(),
    marketContext: emptyEchonMarketContext(),
            provenance: [],
            freshness: { sources: [] },
            links: {
                projectPath: '/p',
                domainScanPath: null,
                geoRunPath: null,
                rankingsPath: null,
            },
        });
        expect(text.geoScore).toBe('Agent GEO text');
        expect(text.llmVisibility).toContain('LLM');
    });
});
