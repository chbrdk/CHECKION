/**
 * Tests for competitive benchmark builder.
 */
import { describe, it, expect } from 'vitest';
import { buildCompetitiveBenchmark } from '@/lib/project-report/competitive-analysis';
import type { ProjectReportBundle } from '@/lib/project-report/types';

function baseFacts(): Omit<ProjectReportBundle, 'visuals' | 'narrative' | 'deep'> {
    return {
        version: '2.0',
        generatedAt: new Date().toISOString(),
        locale: 'en',
        variant: 'comprehensive',
        project: {
            id: 'p1',
            name: 'Test',
            domain: 'own.com',
            industry: null,
            valueProposition: null,
            tags: [],
            competitors: ['rival.com'],
            counts: {
                domainScans: 1,
                journeyRuns: 0,
                geoEeatRuns: 0,
                singleScans: 0,
                rankTrackingKeywords: 0,
            },
        },
        domain: {
            scanId: 's1',
            domain: 'own.com',
            score: 80,
            wcagScore: 75,
            seoOnPageScore: 70,
            seoOnPageLabel: 'good',
            totalPageCount: 100,
            scannedAt: null,
            issueStats: { errors: 2, warnings: 5, notices: 0 },
            performance: { avgTtfb: 100, avgFcp: 800, avgLcp: 2000 },
            eco: { avgCo2: 0.4, gradeDistribution: {} },
            pageClassification: {
                coverage: { totalPages: 100, pagesWithClassification: 80 },
                topThemes: [
                    { tag: 'Product', score: 120, pageCount: 30, maxTier: 5, avgTier: 4 },
                    { tag: 'Blog', score: 40, pageCount: 10, maxTier: 3, avgTier: 3 },
                ],
                tierDistribution: {
                    avgTagsPerPageByTier: { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 },
                    pagesWithAtLeastOneTier5: 5,
                    pagesDominatedByLowTiers: 2,
                },
                pageSamples: [],
            },
            systemicIssues: [],
            llmSummary: null,
            evidenceIds: {
                wcagScore: 'ev-wcag',
                seoScore: 'ev-seo',
                domainScore: 'ev-domain',
            },
        },
        competitors: [
            {
                domain: 'rival.com',
                scanId: 'c1',
                status: 'complete',
                score: 72,
                wcagScore: 80,
                seoOnPageScore: 65,
                seoOnPageLabel: 'fair',
                totalPageCount: 80,
                pageClassification: {
                    coverage: { totalPages: 80, pagesWithClassification: 60 },
                    topThemes: [
                        { tag: 'Product', score: 90, pageCount: 20, maxTier: 5, avgTier: 4 },
                        { tag: 'Pricing', score: 50, pageCount: 8, maxTier: 4, avgTier: 3 },
                    ],
                    tierDistribution: {
                        avgTagsPerPageByTier: { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 },
                        pagesWithAtLeastOneTier5: 3,
                        pagesDominatedByLowTiers: 1,
                    },
                    pageSamples: [],
                },
                issueStats: { errors: 1, warnings: 3, notices: 0 },
                performance: { avgTtfb: 90, avgFcp: 700, avgLcp: 1800 },
                eco: { avgCo2: 0.3, gradeDistribution: {} },
                systemicIssues: [],
                llmSummary: null,
                evidenceIds: {
                    wcagScore: 'ev-comp-wcag',
                    seoScore: 'ev-comp-seo',
                    domainScore: 'ev-comp-domain',
                },
                evidenceId: 'ev-comp-wcag',
            },
        ],
        rankings: {
            score: 60,
            keywordCount: 3,
            lastUpdated: null,
            competitorScores: { 'rival.com': 55 },
            topKeywords: [],
            evidenceId: 'ev-rank',
        },
        geo: {
            score: 50,
            runId: null,
            runUrl: null,
            runCreatedAt: null,
            status: 'complete',
            recommendations: [],
            competitiveDomains: [],
            competitorScores: { 'rival.com': 48 },
            evidenceId: 'ev-geo',
        },
        rankTrends: [],
        journey: null,
        deep: null,
        provenance: [],
        freshness: { sources: [] },
        links: {
            projectPath: '/p',
            domainScanPath: null,
            geoRunPath: null,
            rankingsPath: '/rank',
        },
    };
}

describe('buildCompetitiveBenchmark', () => {
    it('builds scoreboard with deltas and topic overlap', () => {
        const bench = buildCompetitiveBenchmark(baseFacts());
        expect(bench).not.toBeNull();
        expect(bench!.scoreboard).toHaveLength(2);
        const rival = bench!.scoreboard.find((r) => r.domain === 'rival.com');
        expect(rival?.domainScoreDeltaVsOwn).toBe(-8);
        expect(bench!.topicOverlap.some((t) => t.themeTag === 'Product')).toBe(true);
        expect(bench!.summary.sharedThemeCount).toBeGreaterThanOrEqual(1);
    });

    it('emits topic gap insight when competitor has unique theme', () => {
        const bench = buildCompetitiveBenchmark(baseFacts());
        expect(bench!.deterministicInsights.some((i) => i.kind === 'topic_gap')).toBe(true);
    });

    it('returns null when no domain and no competitors', () => {
        const facts = baseFacts();
        facts.domain = null;
        facts.competitors = [];
        expect(buildCompetitiveBenchmark(facts)).toBeNull();
    });
});
