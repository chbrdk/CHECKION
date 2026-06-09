import { describe, it, expect } from 'vitest';
import type { AudiencePersonaFitFact } from '@/lib/project-report/types';
import {
    chunkPersonasForPdfPages,
    formatPersonaPillarChipText,
    PDF_AUDIENCE_PERSONA_LIMIT,
    rankPersonaInsightsForPdf,
    selectDistinctPersonasForPdf,
    truncatePersonaInsightText,
} from '@/lib/project-report/audience-pdf-personas';
import {
    formatAudiencePersonasPdfCaption,
    formatAudiencePillarFitLegend,
    getProjectReportPdfLabels,
} from '@/lib/project-report/pdf-labels';

function persona(
    id: string,
    name: string,
    scores: number[],
    overallFit: AudiencePersonaFitFact['overallFit'] = 'mixed'
): AudiencePersonaFitFact {
    const pillars = ['wcag', 'seo', 'geo', 'rankings', 'performance', 'topics'] as const;
    return {
        personaId: id,
        personaName: name,
        targetGroupId: 'tg',
        targetGroupName: 'TG',
        headline: name,
        painPoints: [],
        goals: [],
        pillars: pillars.map((pillar, index) => ({
            pillar,
            level: 'mixed',
            score: scores[index] ?? 50,
            note: '',
        })),
        overallFit,
        insights: [],
        geoQuestionMatches: [],
        latestUxJourney: null,
        evidenceId: `ev-${id}`,
    };
}

describe('audience-pdf-personas', () => {
    it('limits selection to five personas', () => {
        const personas = Array.from({ length: 8 }, (_, i) =>
            persona(`p-${i}`, `Persona ${i}`, [10 * i, 20 + i, 30, 40, 50, 60])
        );
        expect(selectDistinctPersonasForPdf(personas)).toHaveLength(PDF_AUDIENCE_PERSONA_LIMIT);
    });

    it('prefers personas with diverging pillar profiles', () => {
        const personas = [
            persona('a', 'A', [90, 90, 90, 90, 90, 90]),
            persona('b', 'B', [88, 88, 88, 88, 88, 88]),
            persona('c', 'C', [20, 20, 20, 20, 20, 20]),
            persona('d', 'D', [90, 20, 90, 20, 90, 20]),
        ];
        const selected = selectDistinctPersonasForPdf(personas, 3).map((p) => p.personaId);
        expect(selected).toContain('a');
        expect(selected).toContain('c');
        expect(selected).toContain('d');
        expect(selected).not.toContain('b');
    });

    it('prioritises persona voice and gap insights', () => {
        const ranked = rankPersonaInsightsForPdf(
            [
                {
                    id: '1',
                    kind: 'win',
                    title: 'Win',
                    description: 'x',
                    evidenceId: 'ev',
                },
                {
                    id: '2',
                    kind: 'persona_voice',
                    title: 'Voice',
                    description: 'y',
                    evidenceId: 'ev',
                },
                {
                    id: '3',
                    kind: 'gap',
                    title: 'Gap',
                    description: 'z',
                    evidenceId: 'ev',
                },
            ],
            2
        );
        expect(ranked.map((i) => i.id)).toEqual(['2', '3']);
    });

    it('formats compact pillar chips and truncates insight text', () => {
        expect(formatPersonaPillarChipText('WCAG', 68.4, 'mixed')).toBe('WCAG 68~');
        expect(formatPersonaPillarChipText('SEO', null, 'strong')).toBe('SEO –+');
        expect(truncatePersonaInsightText('abcdef', 4)).toBe('abc…');
    });

    it('can omit persona voice when perspective is shown elsewhere', () => {
        const ranked = rankPersonaInsightsForPdf(
            [
                {
                    id: '2',
                    kind: 'persona_voice',
                    title: 'Voice',
                    description: 'y',
                    evidenceId: 'ev',
                },
                {
                    id: '3',
                    kind: 'gap',
                    title: 'Gap',
                    description: 'z',
                    evidenceId: 'ev',
                },
            ],
            2,
            { omitPersonaVoice: true }
        );
        expect(ranked.map((i) => i.id)).toEqual(['3']);
    });

    it('chunks personas for multi-page PDF layout', () => {
        expect(chunkPersonasForPdfPages([1, 2, 3, 4, 5])).toEqual([[1, 2, 3], [4, 5]]);
    });

    it('formats localized persona caption', () => {
        expect(formatAudiencePersonasPdfCaption('de', 5, 12, 'weitere im AUDION-Projekt')).toContain(
            '5 differenzierendste Personas von 12'
        );
    });

    it('formats pillar fit legend from fit labels', () => {
        const labels = getProjectReportPdfLabels('de');
        expect(formatAudiencePillarFitLegend(labels)).toContain('+');
        expect(formatAudiencePillarFitLegend(labels)).toContain(labels.audienceFitLabels.strong);
    });
});
