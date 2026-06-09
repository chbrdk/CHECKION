import { describe, it, expect } from 'vitest';
import {
    buildFallbackSiteQualityInterpretations,
    lcpToMs,
    resolveSiteQualityInterpretations,
    systemicIssueDescription,
} from '@/lib/project-report/site-quality-interpretations';
import type { DomainFacts } from '@/lib/project-report/types';

const domain: DomainFacts = {
    scanId: 's1',
    domain: 'example.com',
    score: 72,
    wcagScore: 68,
    seoOnPageScore: 81,
    seoOnPageLabel: 'good',
    totalPageCount: 124,
    scannedAt: null,
    issueStats: { errors: 12, warnings: 34, notices: 8 },
    performance: { avgTtfb: 420, avgFcp: 1.8, avgLcp: 2.4 },
    eco: { avgCo2: 0.42, gradeDistribution: { A: 40 } },
    pageClassification: null,
    systemicIssues: [
        { issueId: 'i1', title: 'Fehlende Alt-Texte', count: 34, evidenceId: 'ev-1' },
    ],
    llmSummary: null,
    evidenceIds: { wcagScore: 'ev-w', seoScore: 'ev-s', domainScore: 'ev-d' },
};

describe('site-quality-interpretations', () => {
    it('converts LCP seconds to milliseconds', () => {
        expect(lcpToMs(2.4)).toBe(2400);
        expect(lcpToMs(2800)).toBe(2800);
    });

    it('builds German fallback texts for all site quality metrics', () => {
        const t = buildFallbackSiteQualityInterpretations(domain, 'de');
        expect(t.domainScore).toContain('72');
        expect(t.wcagErrors).toContain('12');
        expect(t.performance).toContain('LCP');
        expect(t.eco).toContain('0.42');
        expect(t.systemicIssues).toContain('Alt-Texte');
    });

    it('prefers agent metricInterpretations over fallback', () => {
        const text = resolveSiteQualityInterpretations({
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
            rankings: null,
            geo: null,
            rankTrends: [],
            journey: null,
            visuals: [],
            narrative: null,
            deep: {
                metrics: [],
                sections: {
                    siteQuality: {
                        title: 'Q',
                        summary: 'Summary',
                        keyFindings: [],
                        metricsHighlighted: [],
                        metricInterpretations: {
                            wcagErrors: 'Agent WCAG text',
                        },
                    },
                    seoRankings: null,
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
            provenance: [],
            freshness: { sources: [] },
            links: {
                projectPath: '/p',
                domainScanPath: null,
                geoRunPath: null,
                rankingsPath: null,
            },
        });
        expect(text.wcagErrors).toBe('Agent WCAG text');
        expect(text.domainScore).toContain('72');
    });

    it('matches systemic issue descriptions to key findings when possible', () => {
        const desc = systemicIssueDescription(
            domain.systemicIssues[0]!,
            ['Fehlende Alt-Texte bremsen Screenreader'],
            'de'
        );
        expect(desc).toContain('Alt-Texte');
    });
});
