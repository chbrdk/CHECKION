import { describe, it, expect } from 'vitest';
import { buildEchonReportResearchQuery } from '@/lib/project-report/echon-research-query';
import { parseEchonResearchAnswerToMarketContext } from '@/lib/project-report/echon-market-context';
import type { AudionPersonaFact } from '@/lib/integrations/audion-audience-client';
import { emptyProjectSetupContext } from '@/lib/project-report/project-setup-context';

const persona: AudionPersonaFact = {
    id: 'p1',
    name: 'Sandra, 38',
    headline: 'Sucht schnelle Klarheit über Deckungssummen',
    segment: 'B2C',
    targetGroupId: 'tg1',
    targetGroupName: 'Hundehalter',
    painPoints: ['Unklare Tarife'],
    goals: ['Transparente Preise'],
    interests: [],
    latestUxJourney: null,
};

describe('buildEchonReportResearchQuery', () => {
    it('includes AUDION persona pain points and goals in German query', () => {
        const q = buildEchonReportResearchQuery({
            locale: 'de',
            project: {
                id: 'proj',
                name: 'HK',
                domain: 'haftpflichtkasse.de',
                industry: 'insurance',
                valueProposition: 'Transparente Haftpflicht',
                tags: [],
                competitors: ['rival.de'],
                counts: {
                    domainScans: 0,
                    journeyRuns: 0,
                    geoEeatRuns: 0,
                    singleScans: 0,
                    rankTrackingKeywords: 0,
                },
            },
            setup: emptyProjectSetupContext(),
            audience: {
                available: true,
                audionProjectId: 'a1',
                audionProjectName: 'HK',
                targetGroups: [],
                personas: [],
                summaryInsights: [],
            },
            sourcePersonas: [persona],
        });
        expect(q).toContain('Sandra, 38');
        expect(q).toContain('Hundehalter');
        expect(q).toContain('Unklare Tarife');
        expect(q).toContain('haftpflichtkasse.de');
    });

    it('falls back to setup target groups when no personas', () => {
        const q = buildEchonReportResearchQuery({
            locale: 'de',
            project: {
                id: 'p',
                name: 'X',
                domain: 'x.de',
                industry: null,
                valueProposition: null,
                tags: [],
                competitors: [],
                counts: {
                    domainScans: 0,
                    journeyRuns: 0,
                    geoEeatRuns: 0,
                    singleScans: 0,
                    rankTrackingKeywords: 0,
                },
            },
            setup: {
                ...emptyProjectSetupContext(),
                available: true,
                targetGroups: ['Makler', 'Privatkunden'],
            },
            audience: {
                available: false,
                audionProjectId: null,
                audionProjectName: null,
                targetGroups: [],
                personas: [],
                summaryInsights: [],
            },
            sourcePersonas: [],
        });
        expect(q).toContain('Makler');
        expect(q).toContain('Privatkunden');
    });
});

describe('parseEchonResearchAnswerToMarketContext', () => {
    it('parses chat answer payload', () => {
        const ctx = parseEchonResearchAnswerToMarketContext(
            {
                executive_summary: 'Markt unter Druck.',
                key_findings: ['Regulatorik'],
                recommended_watchlist: ['GDV'],
                confidence: 0.7,
            },
            { threadId: 'a1b2c3d4-e5f6-4789-a012-3456789abcde', citationCount: 3 }
        );
        expect(ctx.available).toBe(true);
        expect(ctx.keyFindings).toEqual(['Regulatorik']);
        expect(ctx.citationCount).toBe(3);
    });
});
