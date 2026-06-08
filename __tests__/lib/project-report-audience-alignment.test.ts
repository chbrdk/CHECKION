import { describe, it, expect } from 'vitest';
import {
    buildAudienceReportOverlay,
    personaPillarSalience,
    weightedTokensFromPersona,
} from '@/lib/project-report/audience-alignment';
import type { AudionAudienceReportResponse } from '@/lib/integrations/audion-audience-client';
import type { ProjectReportBundle } from '@/lib/project-report/types';

const audionSample: AudionAudienceReportResponse = {
    available: true,
    audionProjectId: 'aud-1',
    audionProjectName: 'Demo AUDION',
    checkionProjectId: 'p1',
    targetGroups: [{ id: 'tg1', name: 'Makler', segment: 'B2B', description: null, personaCount: 1 }],
    personas: [
        {
            id: 'persona-1',
            name: 'Sandra',
            headline: 'Versicherungsmaklerin',
            segment: 'Broker',
            targetGroupId: 'tg1',
            targetGroupName: 'Makler',
            painPoints: ['Kunden fragen nach Hundehalterhaftpflicht'],
            goals: ['Schnelle Empfehlungen'],
            interests: ['Haftpflicht', 'Versicherung'],
            latestUxJourney: null,
        },
    ],
};

const baseFacts = {
    version: '2.0' as const,
    generatedAt: new Date().toISOString(),
    locale: 'de' as const,
    variant: 'comprehensive' as const,
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
            geoEeatRuns: 1,
            singleScans: 0,
            rankTrackingKeywords: 0,
        },
    },
    domain: {
        scanId: 's1',
        domain: 'example.com',
        score: 80,
        wcagScore: 75,
        seoOnPageScore: 82,
        seoOnPageLabel: 'good',
        totalPageCount: 50,
        scannedAt: null,
        issueStats: { errors: 1, warnings: 2, notices: 0 },
        performance: { avgTtfb: 100, avgFcp: 800, avgLcp: 2200 },
        eco: null,
        pageClassification: {
            topThemes: [{ tag: 'haftpflicht', score: 90, pageCount: 5, maxTier: 1 }],
        },
        systemicIssues: [],
        llmSummary: null,
        evidenceIds: { wcagScore: 'ev-wcag', seoScore: 'ev-seo', domainScore: 'ev-domain' },
    },
    competitors: [],
    rankings: { score: 65, keywordCount: 3, topKeywords: [], evidenceId: 'ev-rank' },
    geo: { score: 72, recommendations: [], competitiveDomains: [], evidenceId: 'ev-geo' },
    rankTrends: [],
    journey: null,
    visuals: [],
    deep: {
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
        competitiveBenchmark: null,
        geoDeep: {
            summary: {
                modelCount: 2,
                questionCount: 1,
                pageCount: 1,
                avgGeoFitness: 70,
                avgTrust: 4,
                pagesBelowGeoThreshold: 0,
            },
            modelBenchmarks: [],
            questionDetails: [
                {
                    queryText: 'Welche Versicherung empfehlen Makler für Hundehalterhaftpflicht?',
                    queryIndex: 1,
                    latestPosition: 1.2,
                    trend: 'stable',
                    positionsByModel: [],
                    topCitedDomains: ['vhv.de'],
                    points: [],
                    evidenceId: 'q1',
                },
            ],
            pages: [],
            deterministicInsights: [],
        },
    },
    provenance: [],
    freshness: { sources: [] },
    links: {
        projectPath: '/projects/p1',
        domainScanPath: null,
        geoRunPath: null,
        rankingsPath: '/projects/p1/rankings',
    },
} satisfies Omit<ProjectReportBundle, 'narrative' | 'audience'>;

describe('audience-alignment', () => {
    it('builds persona fit with geo question matches', () => {
        const overlay = buildAudienceReportOverlay(audionSample, baseFacts, 'de');
        expect(overlay.available).toBe(true);
        expect(overlay.personas).toHaveLength(1);
        const persona = overlay.personas[0];
        expect(persona.geoQuestionMatches.length).toBeGreaterThan(0);
        expect(persona.pillars.some((p) => p.pillar === 'topics')).toBe(true);
        expect(persona.insights.length).toBeGreaterThan(0);
    });

    it('returns unavailable when no personas', () => {
        const overlay = buildAudienceReportOverlay({ available: false, reason: 'no_link' }, baseFacts, 'de');
        expect(overlay.available).toBe(false);
    });

    it('differentiates pillar scores between personas with distinct profiles', () => {
        const audionTwo: AudionAudienceReportResponse = {
            ...audionSample,
            personas: [
                audionSample.personas![0],
                {
                    id: 'persona-2',
                    name: 'Tom',
                    headline: 'Barrierefreiheits-Consultant',
                    segment: 'Accessibility',
                    targetGroupId: 'tg2',
                    targetGroupName: 'A11y',
                    painPoints: ['WCAG-Kontrast und Screenreader-Navigation'],
                    goals: ['Barrierefreie Formulare'],
                    interests: ['Accessibility', 'Inklusion'],
                    latestUxJourney: null,
                },
            ],
        };

        const overlay = buildAudienceReportOverlay(audionTwo, baseFacts, 'de');
        expect(overlay.personas).toHaveLength(2);

        const sandraTopics = overlay.personas[0].pillars.find((p) => p.pillar === 'topics')?.score;
        const tomTopics = overlay.personas[1].pillars.find((p) => p.pillar === 'topics')?.score;
        expect(sandraTopics).not.toBe(tomTopics);

        const sandraWcag = overlay.personas[0].pillars.find((p) => p.pillar === 'wcag');
        const tomWcag = overlay.personas[1].pillars.find((p) => p.pillar === 'wcag');
        expect(tomWcag?.level).not.toBe('unknown');
        expect(sandraWcag?.score).not.toBe(tomWcag?.score);
    });

    it('assigns higher WCAG salience to accessibility-focused persona tokens', () => {
        const brokerTokens = weightedTokensFromPersona(audionSample.personas![0]);
        const a11yTokens = weightedTokensFromPersona({
            ...audionSample.personas![0],
            id: 'p-a11y',
            painPoints: ['WCAG Kontrast Screenreader'],
            goals: ['Barrierefreie Navigation'],
            interests: ['Accessibility'],
            headline: 'Accessibility Lead',
            segment: 'A11y',
        });
        expect(personaPillarSalience(a11yTokens, 'wcag')).toBeGreaterThan(
            personaPillarSalience(brokerTokens, 'wcag')
        );
    });
});
