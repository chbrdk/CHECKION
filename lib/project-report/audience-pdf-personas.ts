/**
 * PDF audience chapter — persona selection and insight prioritisation.
 */
import type { AudienceInsightFact, AudiencePersonaFitFact, AudienceFitLevel } from '@/lib/project-report/types';

export const PDF_AUDIENCE_PERSONA_LIMIT = 3;
export const PDF_AUDIENCE_PERSONAS_PER_PAGE = 3;
export const PDF_AUDIENCE_PERSONA_INSIGHT_LIMIT = 2;

const SITE_WIDE_INSIGHT_PATTERNS = [
    /\b26[,.]?953\b/,
    /\bwcag[- ]?fehler\b/i,
    /\bsystemische?\b/i,
    /\bon-page[- ]?seo\b.*\b(poor|47)\b/i,
];
export const PDF_AUDIENCE_GEO_MATCH_LIMIT = 1;
export const PDF_AUDIENCE_PERSONA_INSIGHT_DESCRIPTION_MAX = 90;

const PILLAR_ORDER = ['wcag', 'seo', 'geo', 'rankings', 'performance', 'topics'] as const;

export const PDF_PERSONA_PILLAR_SHORT_LABELS: Record<(typeof PILLAR_ORDER)[number], string> = {
    wcag: 'WCAG',
    seo: 'SEO',
    geo: 'GEO',
    rankings: 'Rank',
    performance: 'Perf',
    topics: 'Topics',
};

const INSIGHT_KIND_PRIORITY: Record<AudienceInsightFact['kind'], number> = {
    persona_voice: 0,
    gap: 1,
    friction: 2,
    geo: 3,
    content: 4,
    journey: 5,
    win: 6,
    summary: 7,
};

function fitRank(level: AudienceFitLevel): number {
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

function personaFeatureVector(persona: AudiencePersonaFitFact): number[] {
    const pillarScores = PILLAR_ORDER.map((key) => {
        const row = persona.pillars.find((p) => p.pillar === key);
        return row?.score ?? -1;
    });
    return [...pillarScores, fitRank(persona.overallFit) * 25];
}

function vectorDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i += 1) {
        const delta = a[i]! - b[i]!;
        sum += delta * delta;
    }
    return Math.sqrt(sum);
}

export function formatPersonaPillarChipText(
    shortLabel: string,
    score: number | null | undefined,
    level: AudienceFitLevel
): string {
    const fitSymbol = level === 'strong' ? '+' : level === 'weak' ? '−' : '~';
    const scoreText = score != null ? String(Math.round(score)) : '–';
    return `${shortLabel} ${scoreText}${fitSymbol}`;
}

export function truncatePersonaInsightText(
    text: string,
    max = PDF_AUDIENCE_PERSONA_INSIGHT_DESCRIPTION_MAX
): string {
    const trimmed = text.trim();
    if (trimmed.length <= max) return trimmed;
    return `${trimmed.slice(0, max - 1).trim()}…`;
}

/** Pick personas that differ most in pillar/fit profile (farthest-point sampling). */
export function selectDistinctPersonasForPdf(
    personas: AudiencePersonaFitFact[],
    limit = PDF_AUDIENCE_PERSONA_LIMIT
): AudiencePersonaFitFact[] {
    if (personas.length <= limit) return personas;

    const indexed = personas.map((persona) => ({
        persona,
        vector: personaFeatureVector(persona),
    }));

    let firstIndex = 0;
    let bestAverageDistance = -1;
    for (let i = 0; i < indexed.length; i += 1) {
        let total = 0;
        for (let j = 0; j < indexed.length; j += 1) {
            if (i === j) continue;
            total += vectorDistance(indexed[i]!.vector, indexed[j]!.vector);
        }
        const average = total / (indexed.length - 1);
        if (average > bestAverageDistance) {
            bestAverageDistance = average;
            firstIndex = i;
        }
    }

    const selected = [indexed[firstIndex]!];
    const selectedIds = new Set([indexed[firstIndex]!.persona.personaId]);

    while (selected.length < limit && selected.length < indexed.length) {
        let candidateIndex = -1;
        let bestMinDistance = -1;

        for (let i = 0; i < indexed.length; i += 1) {
            const entry = indexed[i]!;
            if (selectedIds.has(entry.persona.personaId)) continue;
            const minDistance = Math.min(
                ...selected.map((picked) => vectorDistance(picked.vector, entry.vector))
            );
            if (minDistance > bestMinDistance) {
                bestMinDistance = minDistance;
                candidateIndex = i;
            }
        }

        if (candidateIndex < 0) break;
        selected.push(indexed[candidateIndex]!);
        selectedIds.add(indexed[candidateIndex]!.persona.personaId);
    }

    return selected.map((entry) => entry.persona);
}

export function isSiteWideMetricBoilerplate(text: string): boolean {
    return SITE_WIDE_INSIGHT_PATTERNS.some((pattern) => pattern.test(text));
}

export function rankPersonaInsightsForPdf(
    insights: AudienceInsightFact[],
    limit = PDF_AUDIENCE_PERSONA_INSIGHT_LIMIT,
    options?: { omitPersonaVoice?: boolean }
): AudienceInsightFact[] {
    const filtered = options?.omitPersonaVoice
        ? insights.filter((insight) => insight.kind !== 'persona_voice')
        : insights;

    return [...filtered]
        .filter(
            (insight) =>
                !isSiteWideMetricBoilerplate(insight.description) &&
                !isSiteWideMetricBoilerplate(insight.title)
        )
        .sort(
            (a, b) =>
                (INSIGHT_KIND_PRIORITY[a.kind] ?? 99) - (INSIGHT_KIND_PRIORITY[b.kind] ?? 99)
        )
        .slice(0, limit);
}

export function chunkPersonasForPdfPages<T>(items: T[], perPage = PDF_AUDIENCE_PERSONAS_PER_PAGE): T[][] {
    if (items.length === 0) return [];
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += perPage) {
        chunks.push(items.slice(i, i + perPage));
    }
    return chunks;
}
