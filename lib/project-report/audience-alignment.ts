/**
 * Align AUDION personas with CHECKION site metrics for audience reporting.
 * Site-wide metrics are weighted per persona (salience) so similar profiles
 * do not all receive identical pillar scores.
 */

import type { AudionAudienceReportResponse, AudionPersonaFact } from '@/lib/integrations/audion-audience-client';
import {
    PERSONA_PILLAR_SALIENCE_THRESHOLD,
    PERSONA_PILLAR_SIGNALS,
    PERSONA_TOKEN_WEIGHTS,
    type PersonaPillarKey,
} from '@/lib/project-report/persona-pillar-signals';
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

const PILLAR_OVERALL_WEIGHTS: Record<PersonaPillarKey, number> = {
    topics: 3,
    wcag: 2,
    seo: 2,
    geo: 2,
    rankings: 1.5,
    performance: 1.5,
};

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

function addWeightedTokens(map: Map<string, number>, text: string, weight: number): void {
    for (const token of tokenize(text)) {
        map.set(token, (map.get(token) ?? 0) + weight);
    }
}

/** Weighted token bag — pain points weigh more than generic interests. */
export function weightedTokensFromPersona(persona: AudionPersonaFact): Map<string, number> {
    const map = new Map<string, number>();
    for (const item of persona.painPoints) addWeightedTokens(map, item, PERSONA_TOKEN_WEIGHTS.painPoint);
    for (const item of persona.goals) addWeightedTokens(map, item, PERSONA_TOKEN_WEIGHTS.goal);
    for (const item of persona.interests) addWeightedTokens(map, item, PERSONA_TOKEN_WEIGHTS.interest);
    addWeightedTokens(map, persona.headline, PERSONA_TOKEN_WEIGHTS.headline);
    addWeightedTokens(map, persona.segment, PERSONA_TOKEN_WEIGHTS.segment);
    return map;
}

/** Emphasise tokens that distinguish this persona from others in the same report. */
export function distinctiveWeightedTokens(
    persona: AudionPersonaFact,
    allPersonas: AudionPersonaFact[]
): Map<string, number> {
    const mine = weightedTokensFromPersona(persona);
    const others = new Map<string, number>();
    for (const other of allPersonas) {
        if (other.id === persona.id) continue;
        for (const [token, weight] of weightedTokensFromPersona(other)) {
            others.set(token, (others.get(token) ?? 0) + weight);
        }
    }

    const distinct = new Map<string, number>();
    for (const [token, weight] of mine) {
        const shared = others.get(token) ?? 0;
        const residual = weight - shared * 0.6;
        if (residual > 0.2) distinct.set(token, residual);
    }

    const distinctMass = [...distinct.values()].reduce((sum, w) => sum + w, 0);
    return distinctMass >= 1 ? distinct : mine;
}

export function weightedOverlap(persona: Map<string, number>, target: Set<string>): number {
    if (persona.size === 0 || target.size === 0) return 0;
    let hits = 0;
    let total = 0;
    for (const [token, weight] of persona) {
        total += weight;
        if (target.has(token)) hits += weight;
    }
    return total > 0 ? hits / total : 0;
}

function pillarKeywordTokens(pillar: Exclude<PersonaPillarKey, 'topics'>): Set<string> {
    return tokensFromList([...PERSONA_PILLAR_SIGNALS[pillar]]);
}

export function personaPillarSalience(
    personaTokens: Map<string, number>,
    pillar: Exclude<PersonaPillarKey, 'topics'>
): number {
    return weightedOverlap(personaTokens, pillarKeywordTokens(pillar));
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

function lcpQualityScore(lcp: number): number {
    if (lcp <= 2500) return 90;
    if (lcp <= 4000) return 55;
    return 25;
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

/** Site metric × persona salience → persona-specific pillar row. */
export function buildPersonaSitePillar(
    pillar: Exclude<PersonaPillarKey, 'topics'>,
    siteLevel: AudienceFitLevel,
    siteQualityScore: number | null,
    salience: number
): AudiencePillarFit {
    if (siteQualityScore == null || salience < PERSONA_PILLAR_SALIENCE_THRESHOLD) {
        return { pillar, level: 'unknown', score: null };
    }

    const personaScore = Math.round(Math.min(100, salience * siteQualityScore));
    let level = siteLevel;
    if (salience < 0.18 && siteLevel === 'strong') {
        level = 'mixed';
    }

    return { pillar, level, score: personaScore };
}

function aggregateOverall(
    pillars: AudiencePillarFit[],
    geoMatches: GeoQuestionPersonaMatchFact[]
): AudienceFitLevel {
    let sum = 0;
    let weight = 0;

    for (const pillar of pillars) {
        if (pillar.level === 'unknown') continue;
        const w = PILLAR_OVERALL_WEIGHTS[pillar.pillar] ?? 1;
        sum += levelRank(pillar.level) * w;
        weight += w;
    }

    if (geoMatches.length > 0) {
        const topRelevance = geoMatches[0].relevance;
        const geoRank = topRelevance >= 0.35 ? 3 : topRelevance >= 0.15 ? 2 : 1;
        sum += geoRank * 2;
        weight += 2;
    }

    if (weight === 0) return 'unknown';
    const avg = sum / weight;
    if (avg >= 2.5) return 'strong';
    if (avg >= 1.6) return 'mixed';
    return 'weak';
}

function matchGeoQuestions(
    personaTokens: Map<string, number>,
    questions: Array<{ queryText: string; latestPosition: number | null }>,
    limit = 3
): GeoQuestionPersonaMatchFact[] {
    return questions
        .map((q) => ({
            queryText: q.queryText,
            latestPosition: q.latestPosition,
            relevance: weightedOverlap(personaTokens, tokenize(q.queryText)),
        }))
        .filter((q) => q.relevance > 0.05)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit);
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
                ? `${persona.name}: ${weakPillars.join(', ')} — für diese Persona relevant, Site-Scores zu niedrig.`
                : `${persona.name}: ${weakPillars.join(', ')} — salient for this persona, site scores too low.`,
            evidenceId: `ev-audience-${persona.id}`,
        });
    }

    if (topicOverlap < 0.12 && persona.interests.length + persona.goals.length + persona.painPoints.length > 0) {
        insights.push({
            id: `ins-${persona.id}-topics`,
            kind: 'content',
            title: de ? 'Themen-Overlap gering' : 'Low topic overlap',
            description: de
                ? `Schmerzpunkte/Ziele von ${persona.name} spiegeln sich kaum in den Site-Themen wider.`
                : `${persona.name}'s pain points/goals are barely reflected in site content themes.`,
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
    allPersonas: AudionPersonaFact[],
    facts: Omit<ProjectReportBundle, 'visuals' | 'narrative' | 'audience'>,
    locale: 'de' | 'en'
): AudiencePersonaFitFact {
    const profileTokens = weightedTokensFromPersona(persona);
    const topicPersonaTokens = distinctiveWeightedTokens(persona, allPersonas);

    const topicTags =
        facts.domain?.pageClassification?.topThemes?.map((t) => t.tag).filter(Boolean) ?? [];
    const topicTokens = tokensFromList(topicTags);
    const topicScore = weightedOverlap(topicPersonaTokens, topicTokens);

    const geoQuestions =
        facts.deep?.geoDeep?.questionDetails.map((q) => ({
            queryText: q.queryText,
            latestPosition: q.latestPosition,
        })) ?? [];

    const wcagScore = facts.domain?.wcagScore ?? facts.domain?.score ?? null;
    const seoScore = facts.domain?.seoOnPageScore ?? null;
    const geoScore = facts.geo?.score ?? null;
    const rankingsScore = facts.rankings?.score ?? null;
    const lcp = facts.domain?.performance?.avgLcp ?? null;

    const pillars: AudiencePillarFit[] = [
        buildPersonaSitePillar(
            'wcag',
            scoreFromMetric(wcagScore),
            wcagScore,
            personaPillarSalience(profileTokens, 'wcag')
        ),
        buildPersonaSitePillar(
            'seo',
            scoreFromMetric(seoScore),
            seoScore,
            personaPillarSalience(profileTokens, 'seo')
        ),
        buildPersonaSitePillar(
            'geo',
            scoreFromMetric(geoScore),
            geoScore,
            personaPillarSalience(profileTokens, 'geo')
        ),
        buildPersonaSitePillar(
            'rankings',
            scoreFromMetric(rankingsScore),
            rankingsScore,
            personaPillarSalience(profileTokens, 'rankings')
        ),
        buildPersonaSitePillar(
            'performance',
            performanceLevel(lcp),
            lcp != null ? lcpQualityScore(lcp) : null,
            personaPillarSalience(profileTokens, 'performance')
        ),
        {
            pillar: 'topics',
            level: overlapLevel(topicScore),
            score: Math.round(topicScore * 100),
        },
    ];

    const geoMatches = matchGeoQuestions(profileTokens, geoQuestions);
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
        overallFit: aggregateOverall(pillars, geoMatches),
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

    const sourcePersonas = audion.personas;
    const personas = sourcePersonas.map((p) => buildPersonaFit(p, sourcePersonas, facts, locale));
    const summaryInsights: string[] = [];
    const de = locale === 'de';

    const strongCount = personas.filter((p) => p.overallFit === 'strong').length;
    const weakCount = personas.filter((p) => p.overallFit === 'weak').length;

    if (de) {
        summaryInsights.push(
            `${personas.length} Personas aus AUDION mit CHECKION-Site-Daten abgeglichen (persona-gewichtet).`
        );
        if (strongCount > 0) {
            summaryInsights.push(`${strongCount} Persona(s) mit insgesamt starker Passung.`);
        }
        if (weakCount > 0) {
            summaryInsights.push(`${weakCount} Persona(s) mit deutlichen Lücken — priorisierte Insights im Detail.`);
        }
    } else {
        summaryInsights.push(
            `${personas.length} AUDION personas aligned with CHECKION site data (persona-weighted).`
        );
        if (strongCount > 0) summaryInsights.push(`${strongCount} persona(s) show strong overall fit.`);
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
