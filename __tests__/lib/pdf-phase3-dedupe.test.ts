import { describe, it, expect } from 'vitest';
import { competitiveInsightRowsForPdf } from '@/lib/project-report/competitive-interpretations';
import { filterIssueGroupsForPdfAppendix } from '@/lib/project-report/pdf-issue-groups-display';
import { filterRecommendationsForPdf } from '@/lib/project-report/pdf-recommendations-display';
import { selectGeoInsightsForPdf, PDF_GEO_INSIGHT_CARD_LIMIT } from '@/lib/project-report/pdf-geo-display';
import { isSiteWideMetricBoilerplate } from '@/lib/project-report/audience-pdf-personas';
import type { CompetitiveInsightFact } from '@/lib/project-report/types';

describe('PDF phase-3 dedupe', () => {
    it('dedupes duplicate competitive insight card text', () => {
        const insights: CompetitiveInsightFact[] = [
            {
                id: 'topic-gap-a',
                kind: 'topic_gap',
                title: 'Topic gap: Pet insurance',
                description: 'Competitors cover pet insurance.',
                evidenceId: 'e1',
            },
            {
                id: 'topic-gap-b',
                kind: 'topic_gap',
                title: 'Topic gap: Legal protection',
                description: 'Competitors cover pet insurance and legal protection.',
                evidenceId: 'e2',
            },
        ];
        const bundle = {
            version: '1.0',
            generatedAt: '',
            locale: 'de' as const,
            variant: 'comprehensive' as const,
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
            domain: null,
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
                    siteQuality: null,
                    seoRankings: null,
                    geo: null,
                    competitive: {
                        title: 'C',
                        summary: 'S',
                        keyFindings: [],
                        metricsHighlighted: [],
                        metricInterpretations: {
                            'insight:topic-gap-a': 'Same agent text for both gaps in the dataset.',
                            'insight:topic-gap-b': 'Same agent text for both gaps in the dataset.',
                        },
                    },
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
        };
        const rows = competitiveInsightRowsForPdf(insights, bundle);
        expect(rows[0]?.description).not.toBe(rows[1]?.description);
    });

    it('filters appendix issue groups already listed as systemic issues', () => {
        const filtered = filterIssueGroupsForPdfAppendix(
            [
                {
                    groupKey: 'link-name',
                    title: 'Links must have discernible text',
                    pageCount: 441,
                    type: 'error',
                },
                {
                    groupKey: 'lang',
                    title: 'Missing lang attribute on html',
                    pageCount: 341,
                    type: 'error',
                },
            ],
            ['Links must have discernible text']
        );
        expect(filtered).toHaveLength(1);
        expect(filtered[0]?.groupKey).toBe('lang');
    });

    it('filters recommendations that repeat findings', () => {
        const recs = filterRecommendationsForPdf(
            [
                {
                    title: 'Fix WCAG',
                    description: 'Template fixes for WCAG errors across forms and links.',
                    priority: 1,
                },
            ],
            [
                {
                    title: 'WCAG systemisch',
                    description: 'Template fixes for WCAG errors across forms and links.',
                },
            ]
        );
        expect(recs).toHaveLength(0);
    });

    it('limits geo insight cards', () => {
        const insights = Array.from({ length: 6 }, (_, i) => ({
            id: `g${i}`,
            kind: 'question' as const,
            title: `Insight ${i}`,
            description: 'd',
            evidenceId: 'e',
        }));
        expect(selectGeoInsightsForPdf(insights)).toHaveLength(PDF_GEO_INSIGHT_CARD_LIMIT);
    });

    it('drops site-wide boilerplate from persona insights', () => {
        expect(isSiteWideMetricBoilerplate('26.953 WCAG-Fehler auf vielen Seiten')).toBe(true);
        expect(isSiteWideMetricBoilerplate('SLA-Eskalation fehlt im Formularpfad')).toBe(false);
    });
});
