/**
 * Align AUDION personas with CHECKION site metrics for audience reporting.
 */

import type { AudionAudienceReportResponse, AudionPersonaFact } from '@/lib/integrations/audion-audience-client';
import type {
    AudienceFitLevel,
    AudienceInsightFact,
    AudiencePersonaFitFact,
    AudiencePillarFit,
    AudienceReportOverlay,
    GeoQuestionPersonaMatchFact,
    ProjectReportBundle,
} from '@/lib/project-report/types';

const STOP = new Set([
    'und',
    'oder',
    'der',
    'die',
    'das',
    'ein',
    'eine',
    'für',
    'mit',
    'von',
    'zu',
    'im',
    'in',
    'am',
    'an',
    'the',
    'and',
    'for',
    'with',
    'from',
    'to',
    'a',
    'an',
]);

function tokenize(text: string): Set<string> {
    return new Set(
        text
            .toLowerCase()
            .split(/[^a-z0-9äöüß]+/i)
            .map((t) => t.trim())
            .filter((t) => t.length >= 3 && !STOP.has(t))
    );
}

function tokensFromList(items: string[]): Set<string> {
    const out = new Set<string>();
    for (const item of items) {
        for (const t of tokenize(item)) out.add(t);
    }
    return out;
}

function scoreFromMetric(value: number | null | undefined): AudienceFitLevel {
    if (value == null || Number.isNaN(value)) return 'unknown';
    if (value >= 70) return 'strong';
    if (value >= 40) return 'mixed';
    return 'weak';
}

function performanceLevel(lcp: number | null | undefined): AudienceFitLevel {
    if (lcp == null || Number.isNaN(lcp)) return 'unknown';
    if (lcp <= 2500) return 'strong';
    if (lcp <= 4000) return 'mixed';
    return 'weak';
}

function overlapScore(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0;
    let hits = 0;
    for (const t of a) {
        if (b.has(t)) hits += 1;
    }
    return hits / Math.max(a.size, b.size);
}

function overlapLevel(score: number): AudienceFitLevel {
    if (score >= 0.35) return 'strong';
    if (score >= 0.12) return 'mixed';
    if (score > 0) return 'weak';
    return 'unknown';
}

function levelRank(level: AudienceFitLevel): number {
    switch (level) {
        case 'strong':
            return 3;
        case 'mixed':
            return 2;
        case 'weak':
            return 1;
        default:
            return 0;
    }
}

function aggregateOverall(pillars: AudiencePillarFit[]): AudienceFitLevel {
    const ranked = pillars.map((p) => levelRank(p.level)).filter((n) => n > 0);
    if (ranked.length === 0) return 'unknown';
    const avg = ranked.reduce((a, b) => a + b, 0) / ranked.length;
    if (avg >= 2.5) return 'strong';
    if (avg >= 1.6) return 'mixed';
    return 'weak';
}

function matchGeoQuestions(
    personaTokens: Set<string>,
    questions: Array<{ queryText: string; latestPosition: number | null }>,
    limit = 3
): GeoQuestionPersonaMatchFact[] {
    const scored = questions
        .map((q) => ({
            queryText: q.queryText,
            latestPosition: q.latestPosition,
            relevance: overlapScore(personaTokens, tokenize(q.queryText)),
        }))
        .filter((q) => q.relevance > 0.05)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit);
    return scored;
}

function buildPersonaInsights(
    persona: AudionPersonaFact,
    pillars: AudiencePillarFit[],
    topicOverlap: number,
    geoMatches: GeoQuestionPersonaMatchFact[],
    locale: 'de' | 'en'
): AudienceInsightFact[] {
    const insights: AudienceInsightFact[] = [];
    const de = locale === 'de';

    const weakPillars = pillars.filter((p) => p.level === 'weak').map((p) => p.pillar);
    if (weakPillars.length > 0) {
        insights.push({
            id: `ins-${persona.id}-weak`,
            kind: 'gap',
            title: de ? 'Schwache Säulen für diese Persona' : 'Weak pillars for this persona',
            description: de
                ? `${persona.name}: ${weakPillars.join(', ')} — Site-Scores liegen unter Erwartung für diese Zielgruppe.`
                : `${persona.name}: ${weakPillars.join(', ')} — site scores are below expectations for this audience.`,
            evidenceId: `ev-audience-${persona.id}`,
        });
    }

    if (topicOverlap < 0.12 && persona.interests.length + persona.goals.length > 0) {
        insights.push({
            id: `ins-${persona.id}-topics`,
            kind: 'content',
            title: de ? 'Themen-Overlap gering' : 'Low topic overlap',
            description: de
                ? `Interessen/Ziele von ${persona.name} spiegeln sich kaum in den Site-Themen wider.`
                : `${persona.name}'s interests/goals are barely reflected in site content themes.`,
            evidenceId: `ev-audience-${persona.id}`,
        });
    }

    const topGeo = geoMatches[0];
    if (topGeo && topGeo.latestPosition != null && topGeo.latestPosition <= 3) {
        insights.push({
            id: `ins-${persona.id}-geo-strong`,
            kind: 'geo',
            title: de ? 'Starke KI-Sichtbarkeit' : 'Strong AI visibility',
            description: de
                ? `GEO-Frage „${topGeo.queryText.slice(0, 80)}…“ passt zur Persona (Ø #${topGeo.latestPosition}).`
                : `GEO question "${topGeo.queryText.slice(0, 80)}…" aligns with persona (avg #${topGeo.latestPosition}).`,
            evidenceId: `ev-audience-geo-${persona.id}`,
        });
    } else if (topGeo && (topGeo.latestPosition == null || topGeo.latestPosition > 10)) {
        insights.push({
            id: `ins-${persona.id}-geo-gap`,
            kind: 'geo',
            title: de ? 'Relevante GEO-Frage schwach' : 'Relevant GEO question underperforms',
            description: de
                ? `„${topGeo.queryText.slice(0, 80)}…“ ist persona-relevant, aber schlecht sichtbar in LLMs.`
                : `"${topGeo.queryText.slice(0, 80)}…" is persona-relevant but poorly visible in LLMs.`,
            evidenceId: `ev-audience-geo-${persona.id}`,
        });
    }

    const journey = persona.latestUxJourney;
    if (journey && journey.success === false) {
        insights.push({
            id: `ins-${persona.id}-journey`,
            kind: 'journey',
            title: de ? 'UX-Journey gescheitert' : 'UX journey failed',
            description: de
                ? `Letzter Persona-Journey-Run (${journey.task?.slice(0, 60) ?? 'Task'}) war nicht erfolgreich.`
                : `Latest persona journey run (${journey.task?.slice(0, 60) ?? 'task'}) did not succeed.`,
            evidenceId: `ev-audience-journey-${persona.id}`,
        });
    }

    return insights.slice(0, 4);
}

function buildPersonaFit(
    persona: AudionPersonaFact,
    facts: Omit<ProjectReportBundle, 'visuals' | 'narrative' | 'audience'>,
    locale: 'de' | 'en'
): AudiencePersonaFitFact {
    const personaTokens = tokensFromList([
        ...persona.painPoints,
        ...persona.goals,
        ...persona.interests,
        persona.headline,
        persona.segment,
    ]);

    const topicTags =
        facts.domain?.pageClassification?.topThemes?.map((t) => t.tag).filter(Boolean) ?? [];
    const topicTokens = tokensFromList(topicTags);
    const topicScore = overlapScore(personaTokens, topicTokens);

    const geoQuestions =
        facts.deep?.geoDeep?.questionDetails.map((q) => ({
            queryText: q.queryText,
            latestPosition: q.latestPosition,
        })) ?? [];

    const pillars: AudiencePillarFit[] = [
        {
            pillar: 'wcag',
            level: scoreFromMetric(facts.domain?.wcagScore),
            score: facts.domain?.wcagScore ?? null,
        },
        {
            pillar: 'seo',
            level: scoreFromMetric(facts.domain?.seoOnPageScore),
            score: facts.domain?.seoOnPageScore ?? null,
        },
        {
            pillar: 'geo',
            level: scoreFromMetric(facts.geo?.score),
            score: facts.geo?.score ?? null,
        },
        {
            pillar: 'rankings',
            level: scoreFromMetric(facts.rankings?.score),
            score: facts.rankings?.score ?? null,
        },
        {
            pillar: 'performance',
            level: performanceLevel(facts.domain?.performance?.avgLcp ?? null),
            score: facts.domain?.performance?.avgLcp ?? null,
        },
        {
            pillar: 'topics',
            level: overlapLevel(topicScore),
            score: Math.round(topicScore * 100),
        },
    ];

    const geoMatches = matchGeoQuestions(personaTokens, geoQuestions);
    const insights = buildPersonaInsights(persona, pillars, topicScore, geoMatches, locale);

    return {
        personaId: persona.id,
        personaName: persona.name,
        targetGroupId: persona.targetGroupId,
        targetGroupName: persona.targetGroupName,
        headline: persona.headline,
        painPoints: persona.painPoints.slice(0, 5),
        goals: persona.goals.slice(0, 5),
        pillars,
        overallFit: aggregateOverall(pillars),
        insights,
        geoQuestionMatches: geoMatches,
        latestUxJourney: persona.latestUxJourney
            ? {
                  task: persona.latestUxJourney.task,
                  success: persona.latestUxJourney.success,
                  stepsCount: persona.latestUxJourney.stepsCount,
                  createdAt: persona.latestUxJourney.createdAt,
              }
            : null,
        evidenceId: `ev-audience-${persona.id}`,
    };
}

export function buildAudienceReportOverlay(
    audion: AudionAudienceReportResponse,
    facts: Omit<ProjectReportBundle, 'visuals' | 'narrative' | 'audience'>,
    locale: 'de' | 'en'
): AudienceReportOverlay {
    if (!audion.available || !audion.personas?.length) {
        return {
            available: false,
            reason: audion.reason ?? 'no_personas',
            audionProjectId: audion.audionProjectId ?? null,
            audionProjectName: audion.audionProjectName ?? null,
            targetGroups: [],
            personas: [],
            summaryInsights: [],
        };
    }

    const personas = audion.personas.map((p) => buildPersonaFit(p, facts, locale));
    const summaryInsights: string[] = [];
    const de = locale === 'de';

    const strongCount = personas.filter((p) => p.overallFit === 'strong').length;
    const weakCount = personas.filter((p) => p.overallFit === 'weak').length;

    if (de) {
        summaryInsights.push(
            `${personas.length} Personas aus AUDION mit CHECKION-Site-Daten abgeglichen.`
        );
        if (strongCount > 0) {
            summaryInsights.push(`${strongCount} Persona(s) mit insgesamt starker Site-Passung.`);
        }
        if (weakCount > 0) {
            summaryInsights.push(`${weakCount} Persona(s) mit deutlichen Lücken — priorisierte Insights im Detail.`);
        }
    } else {
        summaryInsights.push(`${personas.length} AUDION personas aligned with CHECKION site data.`);
        if (strongCount > 0) summaryInsights.push(`${strongCount} persona(s) show strong overall site fit.`);
        if (weakCount > 0) {
            summaryInsights.push(`${weakCount} persona(s) have notable gaps — see detailed insights.`);
        }
    }

    return {
        available: true,
        audionProjectId: audion.audionProjectId ?? null,
        audionProjectName: audion.audionProjectName ?? null,
        targetGroups: audion.targetGroups ?? [],
        personas,
        summaryInsights,
    };
}

export function unavailableAudienceOverlay(reason: string): AudienceReportOverlay {
    return {
        available: false,
        reason,
        audionProjectId: null,
        audionProjectName: null,
        targetGroups: [],
        personas: [],
        summaryInsights: [],
    };
}
