import { describe, it, expect } from 'vitest';
import { sanitizePersonaAgentResult } from '@/lib/project-report/persona-audience-agent';
import { mergePersonaAgentEvaluation } from '@/lib/project-report/persona-audience-agent';
import type { AudiencePersonaFitFact } from '@/lib/project-report/types';

const baseline: AudiencePersonaFitFact = {
    personaId: 'p1',
    personaName: 'Sandra',
    targetGroupId: 'tg1',
    targetGroupName: 'Makler',
    headline: 'Broker',
    painPoints: ['Haftpflicht'],
    goals: ['Schnelle Empfehlungen'],
    pillars: [
        { pillar: 'wcag', level: 'unknown', score: null },
        { pillar: 'seo', level: 'mixed', score: 50 },
        { pillar: 'geo', level: 'mixed', score: 55 },
        { pillar: 'rankings', level: 'weak', score: 30 },
        { pillar: 'performance', level: 'strong', score: 80 },
        { pillar: 'topics', level: 'strong', score: 75 },
    ],
    overallFit: 'mixed',
    insights: [],
    geoQuestionMatches: [],
    latestUxJourney: null,
    evidenceId: 'ev-audience-p1',
};

describe('persona-audience-agent', () => {
    it('sanitizes valid agent JSON', () => {
        const result = sanitizePersonaAgentResult({
            personaPerspective: 'Ich finde die Haftpflicht-Themen schnell, aber Formulare sind unklar.',
            overallFit: 'mixed',
            pillars: [
                { pillar: 'wcag', score: 45, level: 'mixed', note: 'Kontrast ok, Labels schwach' },
                { pillar: 'seo', score: 72, level: 'strong', note: 'Gute Auffindbarkeit für Makler' },
                { pillar: 'geo', score: 60, level: 'mixed', note: 'KI kennt uns teilweise' },
                { pillar: 'rankings', score: 38, level: 'weak', note: 'Keywords zu generisch' },
                { pillar: 'performance', score: 85, level: 'strong', note: 'Schnell auf Mobile' },
                { pillar: 'topics', score: 78, level: 'strong', note: 'Haftpflicht klar abgedeckt' },
            ],
            subScores: [
                {
                    id: 'content_relevance',
                    label: 'Inhalt',
                    score: 80,
                    level: 'strong',
                    note: 'Passt zu meinen Kundenfragen',
                },
                {
                    id: 'findability',
                    label: 'Auffindbarkeit',
                    score: 65,
                    level: 'mixed',
                    note: 'Navigation ok',
                },
                {
                    id: 'trust_credibility',
                    label: 'Vertrauen',
                    score: 55,
                    level: 'mixed',
                    note: 'Siegel fehlen',
                },
            ],
            insights: [
                {
                    kind: 'persona_voice',
                    title: 'Schnelle Empfehlungen',
                    description: 'Ich brauche Vergleichstabellen in 2 Klicks.',
                },
                {
                    kind: 'friction',
                    title: 'Formular-Hürde',
                    description: 'Zu viele Pflichtfelder im Kontaktformular.',
                },
            ],
        });
        expect(result).not.toBeNull();
        expect(result?.pillars).toHaveLength(6);
    });

    it('merges agent evaluation over deterministic baseline', () => {
        const agent = sanitizePersonaAgentResult({
            personaPerspective: 'Als Sandra wirkt die Seite fachlich solide, aber zu langsam beim Vergleich.',
            overallFit: 'weak',
            pillars: [
                { pillar: 'wcag', score: 40, level: 'weak', note: 'WCAG note' },
                { pillar: 'seo', score: 70, level: 'strong', note: 'SEO note' },
                { pillar: 'geo', score: 55, level: 'mixed', note: 'GEO note' },
                { pillar: 'rankings', score: 35, level: 'weak', note: 'Rank note' },
                { pillar: 'performance', score: 42, level: 'mixed', note: 'Perf note' },
                { pillar: 'topics', score: 88, level: 'strong', note: 'Topics note' },
            ],
            subScores: [
                {
                    id: 'task_clarity',
                    label: 'Klarheit',
                    score: 50,
                    level: 'mixed',
                    note: 'CTA unklar',
                },
                {
                    id: 'findability',
                    label: 'Findability',
                    score: 60,
                    level: 'mixed',
                    note: 'Menu deep',
                },
                {
                    id: 'discovery_geo',
                    label: 'GEO',
                    score: 45,
                    level: 'mixed',
                    note: 'LLM gap',
                },
            ],
            insights: [
                {
                    kind: 'win',
                    title: 'Starke Themen',
                    description: 'Haftpflicht-Inhalte überzeugen.',
                },
                {
                    kind: 'gap',
                    title: 'Vergleich fehlt',
                    description: 'Kein schneller Produktvergleich.',
                },
            ],
        });
        expect(agent).not.toBeNull();
        const merged = mergePersonaAgentEvaluation(baseline, agent);
        expect(merged.evaluationSource).toBe('agent');
        expect(merged.personaPerspective).toContain('Sandra');
        expect(merged.pillars.find((p) => p.pillar === 'seo')?.score).toBe(70);
        expect(merged.pillars.find((p) => p.pillar === 'seo')?.note).toBe('SEO note');
        expect(merged.subScores).toHaveLength(3);
        expect(merged.overallFit).toBe('weak');
    });

    it('keeps deterministic baseline when agent fails', () => {
        const merged = mergePersonaAgentEvaluation(baseline, null);
        expect(merged.evaluationSource).toBe('deterministic');
        expect(merged.personaPerspective).toBeUndefined();
    });
});
