/**
 * Build ECHON research query for comprehensive report runs (persona-driven).
 */

import type { AudionPersonaFact } from '@/lib/integrations/audion-audience-client';
import type { AudienceReportOverlay, ProjectFacts, ProjectReportLocale } from '@/lib/project-report/types';
import type { ProjectSetupContext } from '@/lib/project-report/project-setup-context';

const MAX_QUERY_CHARS = 3800;
const MAX_PERSONAS = 5;

function uniqueStrings(items: string[], max: number): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of items) {
        const t = item.trim();
        if (!t) continue;
        const key = t.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(t);
        if (out.length >= max) break;
    }
    return out;
}

function formatPersonaBlock(persona: AudionPersonaFact, locale: ProjectReportLocale): string {
    const pains = persona.painPoints.slice(0, 3).join('; ');
    const goals = persona.goals.slice(0, 3).join('; ');
    const group = persona.targetGroupName ? ` (${persona.targetGroupName})` : '';
    if (locale === 'de') {
        return `- ${persona.name}${group}: ${persona.headline}. Pain points: ${pains || '—'}. Ziele: ${goals || '—'}.`;
    }
    return `- ${persona.name}${group}: ${persona.headline}. Pain points: ${pains || '—'}. Goals: ${goals || '—'}.`;
}

export interface EchonReportResearchQueryInput {
    locale: ProjectReportLocale;
    project: ProjectFacts;
    setup: ProjectSetupContext;
    audience: AudienceReportOverlay;
    sourcePersonas: AudionPersonaFact[];
}

/**
 * One ECHON research run per report — query synthesized from AUDION personas (or setup target groups).
 */
export function buildEchonReportResearchQuery(input: EchonReportResearchQueryInput): string {
    const { locale, project, setup, sourcePersonas } = input;
    const domain = project.domain ?? project.name;
    const industry = project.industry ?? setup.industry ?? (locale === 'de' ? 'unbekannt' : 'unknown');
    const competitors = uniqueStrings(
        [...project.competitors, ...setup.configuredCompetitors],
        6
    );
    const personas = sourcePersonas.slice(0, MAX_PERSONAS);
    const targetGroups =
        personas.length > 0
            ? personas.map((p) => formatPersonaBlock(p, locale))
            : setup.targetGroups.length > 0
              ? setup.targetGroups.map((tg) => `- ${tg}`)
              : input.audience.targetGroups.slice(0, MAX_PERSONAS).map((tg) => `- ${tg.name}: ${tg.segment}`);

    const valueProp = project.valueProposition ?? setup.valueProposition;

    if (locale === 'de') {
        const parts = [
            `Markt- und Signallage für Website/Brand „${domain}“ (Branche: ${industry}).`,
            valueProp ? `Value Proposition: ${valueProp}` : null,
            competitors.length ? `Wettbewerber-Kontext: ${competitors.join(', ')}.` : null,
            targetGroups.length
                ? `Relevante Zielgruppen/Personas:\n${targetGroups.join('\n')}`
                : 'Keine verknüpften Personas — allgemeine Branchenperspektive.',
            '',
            'Aufgabe: Analysiere externe Signale, Trends, Regulierung und Wettbewerbsdynamik, die diese Zielgruppen und die digitale Sichtbarkeit dieser Marke betreffen.',
            'Fokus: Was bedeutet das für Website-Strategie, Content und Wettbewerbspositionierung?',
            'Antworte strukturiert mit executive_summary, key_findings, implications, recommended_watchlist.',
        ];
        return parts.filter(Boolean).join('\n').slice(0, MAX_QUERY_CHARS);
    }

    const parts = [
        `Market and signal landscape for website/brand "${domain}" (industry: ${industry}).`,
        valueProp ? `Value proposition: ${valueProp}` : null,
        competitors.length ? `Competitor context: ${competitors.join(', ')}.` : null,
        targetGroups.length
            ? `Relevant target groups/personas:\n${targetGroups.join('\n')}`
            : 'No linked personas — use general industry perspective.',
        '',
        'Task: Analyze external signals, trends, regulation, and competitive dynamics affecting these audiences and this brand’s digital visibility.',
        'Focus: Implications for website strategy, content, and competitive positioning.',
        'Respond with executive_summary, key_findings, implications, recommended_watchlist.',
    ];
    return parts.filter(Boolean).join('\n').slice(0, MAX_QUERY_CHARS);
}
