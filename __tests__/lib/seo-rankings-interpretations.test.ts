import { describe, it, expect } from 'vitest';
import {
    buildFallbackSeoInterpretations,
    resolveSeoInterpretations,
    summarizeRankTrends,
} from '@/lib/project-report/seo-rankings-interpretations';
import { emptyProjectSetupContext } from '@/lib/project-report/project-setup-context';
import { emptyEchonMarketContext } from '@/lib/project-report/echon-market-context';
import type { DomainFacts, RankingFacts } from '@/lib/project-report/types';

const domain: DomainFacts = {
    scanId: 's1',
    domain: 'example.com',
    score: 72,
    wcagScore: 68,
    seoOnPageScore: 81,
    seoOnPageLabel: 'good',
    totalPageCount: 124,
    scannedAt: null,
    issueStats: { errors: 0, warnings: 0, notices: 0 },
    performance: null,
    eco: null,
    pageClassification: null,
    systemicIssues: [],
    llmSummary: null,
    evidenceIds: { wcagScore: 'ev-w', seoScore: 'ev-s', domainScore: 'ev-d' },
};

const rankings: RankingFacts = {
    score: 58,
    keywordCount: 48,
    lastUpdated: null,
    competitorScores: {},
    topKeywords: [
        { id: 'k1', keyword: 'hundehalterhaftpflicht', position: 8, evidenceId: 'ev-1' },
        { id: 'k2', keyword: 'haftpflicht hund', position: 14, evidenceId: 'ev-2' },
    ],
    evidenceId: 'ev-r',
};

describe('seo-rankings-interpretations', () => {
    it('builds German fallback texts for SEO metrics', () => {
        const t = buildFallbackSeoInterpretations(domain, rankings, [], 'de');
        expect(t.seoOnPage).toContain('81');
        expect(t.serpRankingsOverview).toContain('58');
        expect(t.serpRankingsOverview).toContain('48');
    });

    it('summarizes improving rank trends', () => {
        const text = summarizeRankTrends(
            [
                {
                    keywordId: 'k1',
                    keyword: 'test',
                    points: [
                        { recordedAt: '2026-05-01', position: 14 },
                        { recordedAt: '2026-06-01', position: 8 },
                    ],
                },
            ],
            'de'
        );
        expect(text).toContain('verbessern');
    });

    it('prefers agent metricInterpretations over fallback', () => {
        const text = resolveSeoInterpretations({
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
                    geoEeatRuns: 0,
                    singleScans: 0,
                    rankTrackingKeywords: 0,
                },
            },
            domain,
            competitors: [],
            rankings,
            geo: null,
            rankTrends: [],
            journey: null,
            visuals: [],
            narrative: null,
            deep: {
                metrics: [],
                sections: {
                    siteQuality: null,
                    seoRankings: {
                        title: 'SEO',
                        summary: 'Summary',
                        keyFindings: [],
                        metricsHighlighted: [],
                        metricInterpretations: {
                            serpRankingsOverview: 'Agent SERP rankings text',
                        },
                    },
                    geo: null,
                    competitive: null,
                    journey: null,
                },
                geoQuestionHistory: [],
                geoPages: [],
                geoDeep: null,
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
        expect(text.serpRankingsOverview).toBe('Agent SERP rankings text');
        expect(text.seoOnPage).toContain('81');
    });
});
