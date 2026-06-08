/**
 * Tests for project report chart spec builder.
 */
import { describe, it, expect } from 'vitest';
import { buildChartSpecs } from '@/lib/project-report/chart-specs';
import type { CompetitorFacts, DomainFacts, GeoFacts, RankingFacts } from '@/lib/project-report/types';

describe('buildChartSpecs', () => {
    const domain: DomainFacts = {
        scanId: 'scan-1',
        domain: 'example.com',
        score: 80,
        wcagScore: 72,
        seoOnPageScore: 65,
        seoOnPageLabel: 'good',
        totalPageCount: 100,
        scannedAt: null,
        issueStats: { errors: 5, warnings: 10, notices: 2 },
        performance: null,
        eco: null,
        pageClassification: {
            coverage: { totalPages: 100, pagesWithClassification: 50 },
            topThemes: [{ tag: 'Product', score: 120, pageCount: 20, maxTier: 5, avgTier: 4 }],
            tierDistribution: {
                avgTagsPerPageByTier: { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 },
                pagesWithAtLeastOneTier5: 5,
                pagesDominatedByLowTiers: 2,
            },
            pageSamples: [],
        },
        systemicIssues: [],
        llmSummary: null,
        evidenceIds: { wcagScore: 'ev-wcag-score', seoScore: 'ev-seo-score', domainScore: 'ev-domain-score' },
    };

    const competitors: CompetitorFacts[] = [
        {
            domain: 'competitor.com',
            scanId: 'c1',
            status: 'complete',
            score: 70,
            wcagScore: 60,
            seoOnPageScore: 55,
            seoOnPageLabel: 'fair',
            totalPageCount: 80,
            pageClassification: null,
            evidenceId: 'ev-competitor-wcag-competitor-com',
        },
    ];

    const rankings: RankingFacts = {
        score: 75,
        keywordCount: 5,
        lastUpdated: null,
        competitorScores: {},
        topKeywords: [{ id: 'k1', keyword: 'test keyword', position: 3, evidenceId: 'ev-k1' }],
        evidenceId: 'ev-ranking-score',
    };

    const geo: GeoFacts = {
        score: 55,
        runId: 'g1',
        runUrl: 'https://example.com',
        runCreatedAt: null,
        status: 'complete',
        recommendations: [],
        competitiveDomains: [{ domain: 'example.com', shareOfVoice: 0.4, avgPosition: 2, score: 55, evidenceId: 'ev-geo-comp-example-com' }],
        competitorScores: {},
        evidenceId: 'ev-geo-score',
    };

    it('builds score cards and charts when data present', () => {
        const specs = buildChartSpecs(domain, competitors, rankings, geo, 'example.com', []);
        const kinds = specs.map((s) => s.kind);
        expect(kinds).toContain('scoreCards');
        expect(kinds).toContain('competitorBarChart');
        expect(kinds).toContain('rankingKeywords');
        expect(kinds).toContain('geoCompetitive');
        expect(kinds).toContain('pageTopics');
    });

    it('returns only score cards when minimal data', () => {
        const specs = buildChartSpecs(null, [], null, null, null, []);
        expect(specs).toHaveLength(1);
        expect(specs[0]!.kind).toBe('scoreCards');
    });

    it('adds geo question trend and competitor ranking charts from deep data', () => {
        const rankingsWithCompetitors: RankingFacts = {
            ...rankings,
            competitorScores: { 'rival.com': 55 },
        };
        const specs = buildChartSpecs(domain, competitors, rankingsWithCompetitors, geo, 'example.com', [], {
            metrics: [],
            sections: {
                siteQuality: null,
                seoRankings: null,
                geo: null,
                competitive: null,
                journey: null,
            },
            geoQuestionHistory: [
                {
                    queryText: 'best product',
                    queryIndex: 0,
                    points: [],
                    latestPosition: 3,
                    trend: 'improving',
                    evidenceId: 'ev-q0',
                },
            ],
            geoPages: [],
            rankKeywordDetails: [],
            issueGroups: [],
            seoRollup: null,
        });
        const kinds = specs.map((s) => s.kind);
        expect(kinds).toContain('geoQuestionTrend');
        expect(kinds).toContain('competitorRankingScores');
    });
});
