import { describe, it, expect } from 'vitest';
import {
    buildFallbackCompetitiveInterpretations,
    competitiveInsightDescription,
    competitiveInsightMetricKey,
    interpretSerpCompetition,
    resolveCompetitiveInterpretations,
} from '@/lib/project-report/competitive-interpretations';
import type { CompetitiveBenchmarkFacts } from '@/lib/project-report/types';

const benchmark: CompetitiveBenchmarkFacts = {
    scoreboard: [
        {
            domain: 'own.de',
            isOwn: true,
            domainScore: 72,
            seoOnPageScore: 68,
            geoScore: 55,
            rankingScore: 40,
            wcagErrors: 120,
            lcpMs: 3200,
        },
        {
            domain: 'competitor-a.de',
            isOwn: false,
            domainScore: 81,
            seoOnPageScore: 78,
            geoScore: 70,
            rankingScore: 65,
            wcagErrors: 12,
            lcpMs: 2100,
        },
    ],
    topicOverlap: [
        {
            themeTag: 'Haftpflicht',
            themeTagKey: 'haftpflicht',
            own: null,
            competitors: {
                'competitor-a.de': { score: 82, pageCount: 4, maxTier: 3, avgTier: 2.4 },
            },
            presentOn: ['competitor-a.de'],
            evidenceId: 'ev-topic-1',
        },
        {
            themeTag: 'Kundenportal',
            themeTagKey: 'kundenportal',
            own: { score: 70, pageCount: 3, maxTier: 2, avgTier: 1.8 },
            competitors: {},
            presentOn: ['own.de'],
            evidenceId: 'ev-topic-2',
        },
    ],
    deterministicInsights: [
        {
            id: 'seo-gap',
            kind: 'gap' as const,
            title: 'SEO on-page below leading competitor',
            description: 'Own SEO 68 vs competitor-a.de 78.',
            evidenceId: 'ev-seo',
        },
    ],
    summary: {
        ownDomainScoreRank: 2,
        ownSeoRank: 2,
        uniqueOwnThemes: 1,
        themesOnlyCompetitorsHave: 1,
        completeCompetitorCount: 1,
    },
};

describe('competitive-interpretations', () => {
    it('builds German fallback texts for scoreboard and topic overlap', () => {
        const t = buildFallbackCompetitiveInterpretations(benchmark, 'de');
        expect(t.competitiveOverview).toContain('#2');
        expect(t.scoreboard).toContain('Scoreboard');
        expect(t.topicOverlap).toContain('Haftpflicht');
        expect(t.topicOverlap).toContain('Kundenportal');
    });

    it('summarizes SERP leaders for keyword table', () => {
        const text = interpretSerpCompetition(
            [
                {
                    id: 'k1',
                    keyword: 'haftpflicht',
                    position: 5,
                    positionDelta: null,
                    serpLeaderDomain: 'competitor-a.de',
                    evidenceId: 'ev-k1',
                },
                {
                    id: 'k2',
                    keyword: 'kasse',
                    position: 2,
                    positionDelta: null,
                    serpLeaderDomain: 'competitor-a.de',
                    evidenceId: 'ev-k2',
                },
            ],
            'de'
        );
        expect(text).toContain('competitor-a');
        expect(text).toContain('2 Keywords');
    });

    it('includes insights overview in fallback when insights exist', () => {
        const t = buildFallbackCompetitiveInterpretations(benchmark, 'de');
        expect(t.insightsOverview).toContain('1 Wettbewerbs-Signale');
    });

    it('prefers agent insight interpretation over fallback description', () => {
        const text = competitiveInsightDescription(
            benchmark.deterministicInsights[0]!,
            {
                version: '1.0',
                generatedAt: '',
                locale: 'de',
                variant: 'comprehensive',
                project: {
                    id: 'p',
                    name: 'P',
                    domain: 'own.de',
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
                            title: 'Wettbewerb',
                            summary: 'Summary',
                            keyFindings: [],
                            metricsHighlighted: [],
                            metricInterpretations: {
                                [competitiveInsightMetricKey('seo-gap')]: 'Agent: SEO-Rückstand kostet Sichtbarkeit bei Kern-Suchbegriffen.',
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
                    competitiveBenchmark: benchmark,
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
            }
        );
        expect(text).toBe('Agent: SEO-Rückstand kostet Sichtbarkeit bei Kern-Suchbegriffen.');
    });

    it('prefers agent metricInterpretations over fallback', () => {
        const resolved = resolveCompetitiveInterpretations({
            version: '1.0',
            generatedAt: '',
            locale: 'de',
            variant: 'comprehensive',
            project: {
                id: 'p',
                name: 'P',
                domain: 'own.de',
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
                        title: 'Wettbewerb',
                        summary: 'Agent summary',
                        keyFindings: [],
                        metricsHighlighted: [],
                        metricInterpretations: {
                            scoreboard: 'Agent scoreboard text',
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
                competitiveBenchmark: benchmark,
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
        expect(resolved.scoreboard).toBe('Agent scoreboard text');
        expect(resolved.topicOverlap).toContain('Haftpflicht');
    });
});
