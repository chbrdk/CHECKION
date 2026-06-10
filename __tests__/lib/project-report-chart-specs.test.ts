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
            issueStats: { errors: 0, warnings: 0, notices: 0 },
            performance: null,
            eco: null,
            systemicIssues: [],
            llmSummary: null,
            evidenceIds: {
                wcagScore: 'ev-competitor-wcag-competitor-com',
                seoScore: 'ev-competitor-seo-competitor-com',
                domainScore: 'ev-competitor-domain-competitor-com',
            },
            evidenceId: 'ev-competitor-wcag-competitor-com',
        },
    ];

    const rankings: RankingFacts = {
        score: 75,
        keywordCount: 5,
        lastUpdated: null,
        competitorScores: {},
        topKeywords: [
            { id: 'k1', keyword: 'test keyword', position: 3, evidenceId: 'ev-k1' },
            { id: 'k2', keyword: 'second keyword', position: 5, evidenceId: 'ev-k2' },
            { id: 'k3', keyword: 'third keyword', position: 8, evidenceId: 'ev-k3' },
        ],
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

    it('skips ranking keyword chart when fewer than three positioned keywords', () => {
        const sparseRankings: RankingFacts = {
            ...rankings,
            topKeywords: [{ id: 'k1', keyword: 'only one', position: 1, evidenceId: 'ev-k1' }],
        };
        const kinds = buildChartSpecs(domain, competitors, sparseRankings, geo, 'example.com', []).map(
            (s) => s.kind
        );
        expect(kinds).not.toContain('rankingKeywords');
    });

    it('returns only score cards when minimal data', () => {
        const specs = buildChartSpecs(null, [], null, null, null, []);
        expect(specs).toHaveLength(1);
        expect(specs[0]!.kind).toBe('scoreCards');
    });

    it('adds competitor ranking charts from deep data without geo question trend charts', () => {
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
                    queryText: 'Which enterprise analytics platform offers the best ROI?',
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
            competitiveBenchmark: null,
            geoDeep: null,
        });
        const kinds = specs.map((s) => s.kind);
        expect(kinds).not.toContain('geoQuestionTrend');
        expect(kinds).not.toContain('geoQuestionTrendSeries');
        expect(kinds).toContain('competitorRankingScores');
    });

    it('adds SEO and topic overlap charts from competitive benchmark', () => {
        const specs = buildChartSpecs(domain, competitors, rankings, geo, 'example.com', [], {
            metrics: [],
            sections: {
                siteQuality: null,
                seoRankings: null,
                geo: null,
                competitive: null,
                journey: null,
            },
            geoQuestionHistory: [],
            geoPages: [],
            rankKeywordDetails: [],
            issueGroups: [],
            seoRollup: null,
            geoDeep: null,
            competitiveBenchmark: {
                scoreboard: [
                    {
                        domain: 'example.com',
                        isOwn: true,
                        scanStatus: 'complete',
                        domainScore: 80,
                        wcagScore: 72,
                        seoOnPageScore: 65,
                        totalPageCount: 100,
                        wcagErrors: 5,
                        avgLcp: null,
                        avgCo2: null,
                        geoScore: 55,
                        rankingScore: 75,
                        domainScoreDeltaVsOwn: 0,
                        seoDeltaVsOwn: 0,
                        evidenceId: 'ev-own',
                    },
                    {
                        domain: 'competitor.com',
                        isOwn: false,
                        scanStatus: 'complete',
                        domainScore: 70,
                        wcagScore: 60,
                        seoOnPageScore: 55,
                        totalPageCount: 80,
                        wcagErrors: 2,
                        avgLcp: null,
                        avgCo2: null,
                        geoScore: null,
                        rankingScore: null,
                        domainScoreDeltaVsOwn: -10,
                        seoDeltaVsOwn: -10,
                        evidenceId: 'ev-comp',
                    },
                ],
                topicOverlap: [
                    {
                        themeTag: 'Product',
                        themeTagKey: 'product',
                        own: { score: 100, pageCount: 10, maxTier: 5, avgTier: 4 },
                        competitors: {
                            'competitor.com': { score: 80, pageCount: 8, maxTier: 4, avgTier: 3 },
                        },
                        presentOn: ['example.com', 'competitor.com'],
                        evidenceId: 'ev-topic',
                    },
                ],
                deterministicInsights: [],
                summary: {
                    completeCompetitorCount: 1,
                    ownDomainScoreRank: 1,
                    ownSeoRank: 1,
                    sharedThemeCount: 1,
                    uniqueOwnThemes: 0,
                    themesOnlyCompetitorsHave: 0,
                },
            },
        });
        const kinds = specs.map((s) => s.kind);
        expect(kinds).toContain('competitorSeoBarChart');
        expect(kinds).toContain('competitorTopicOverlap');
    });
});
