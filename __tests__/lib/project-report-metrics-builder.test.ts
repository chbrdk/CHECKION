/**
 * Tests for deterministic KPI metrics builder.
 */
import { describe, it, expect } from 'vitest';
import { buildMetricInsights } from '@/lib/project-report/metrics-builder';
import type { ProjectReportBundle } from '@/lib/project-report/types';

function minimalFacts(): Omit<ProjectReportBundle, 'visuals' | 'narrative' | 'deep'> {
    return {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        locale: 'en',
        variant: 'executive',
        project: {
            id: 'p1',
            name: 'Test',
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
                rankTrackingKeywords: 2,
            },
        },
        domain: {
            scanId: 's1',
            domain: 'example.com',
            score: 80,
            wcagScore: 72,
            seoOnPageScore: 65,
            seoOnPageLabel: 'good',
            totalPageCount: 50,
            scannedAt: null,
            issueStats: { errors: 3, warnings: 5, notices: 1 },
            performance: { avgTtfb: 100, avgFcp: 800, avgLcp: 2000 },
            eco: { avgCo2: 0.5, gradeDistribution: {} },
            pageClassification: null,
            systemicIssues: [],
            llmSummary: null,
            evidenceIds: {
                wcagScore: 'ev-wcag-score',
                seoScore: 'ev-seo-score',
                domainScore: 'ev-domain-score',
            },
        },
        competitors: [],
        rankings: {
            score: 70,
            keywordCount: 2,
            lastUpdated: null,
            competitorScores: { 'rival.com': 55 },
            topKeywords: [],
            evidenceId: 'ev-ranking-score',
        },
        geo: {
            score: 60,
            runId: 'g1',
            runUrl: null,
            runCreatedAt: null,
            status: 'complete',
            recommendations: [],
            competitiveDomains: [],
            competitorScores: { 'rival.com': 50 },
            evidenceId: 'ev-geo-score',
        },
        rankTrends: [],
        journey: null,
        provenance: [{ evidenceId: 'ev-wcag-score', source: 'domain', label: 'WCAG' }],
        freshness: { sources: [] },
        links: {
            projectPath: '/projects/p1',
            domainScanPath: null,
            geoRunPath: null,
            rankingsPath: '/projects/p1/rankings',
        },
    };
}

describe('buildMetricInsights', () => {
    it('builds WCAG, SEO, rankings, geo and performance metrics', () => {
        const metrics = buildMetricInsights(minimalFacts());
        const ids = metrics.map((m) => m.id);
        expect(ids).toContain('wcag-score');
        expect(ids).toContain('seo-onpage');
        expect(ids).toContain('ranking-score');
        expect(ids).toContain('geo-score');
        expect(ids).toContain('perf-lcp');
        expect(ids).toContain('eco-co2');
    });

    it('includes competitor scores when present', () => {
        const metrics = buildMetricInsights(minimalFacts());
        expect(metrics.some((m) => m.id.startsWith('rank-comp-'))).toBe(true);
        expect(metrics.some((m) => m.id.startsWith('geo-comp-score-'))).toBe(true);
    });
});
