/**
 * Deep GEO / E-E-A-T analysis from latest intensive run + question history.
 */

import { buildPositionMatrixMultiDomain } from '@/lib/geo-eeat/position-matrix';
import { scoreFromGeoMetrics } from '@/lib/project-summaries/geo-summary';
import type {
    GeoDeepAnalysisFact,
    GeoInsightFact,
    GeoModelBenchmarkFact,
    GeoPageAnalysisFact,
    GeoQuestionDetailFact,
    GeoQuestionHistoryFact,
} from '@/lib/project-report/types';
import type { CompetitiveBenchmarkResult, GeoEeatIntensiveResult, GeoEeatPageResult } from '@/lib/types';

const MAX_QUESTIONS = 20;
const MAX_PAGES = 20;
const MAX_CITED_DOMAINS = 5;
const GEO_FITNESS_THRESHOLD = 50;

function shortModelLabel(modelId: string): string {
    return modelId
        .replace(/^gpt-/i, 'GPT ')
        .replace(/^claude-/i, 'Claude ')
        .replace(/^gemini-/i, 'Gemini ')
        .slice(0, 24);
}

function visibilityFromMetrics(avgPosition: number | null, shareOfVoice: number | null): number | null {
    if (avgPosition == null && shareOfVoice == null) return null;
    const posScore =
        avgPosition != null && avgPosition > 0
            ? Math.max(0, Math.min(100, Math.round(100 - (avgPosition - 1) * 12)))
            : 0;
    const sovScore =
        shareOfVoice != null ? Math.max(0, Math.min(100, Math.round(shareOfVoice * 100))) : 0;
    if (avgPosition != null && shareOfVoice != null) {
        return Math.round(posScore * 0.6 + sovScore * 0.4);
    }
    return avgPosition != null ? posScore : sovScore;
}

export function mapGeoPagesDeep(payload: GeoEeatIntensiveResult | null): GeoPageAnalysisFact[] {
    if (!payload?.pages?.length) return [];
    return payload.pages.slice(0, MAX_PAGES).map((p: GeoEeatPageResult, i) => ({
        url: p.url,
        title: p.title,
        geoFitnessScore: p.geoFitnessScore ?? null,
        geoFitnessReasoning: p.geoFitnessReasoning?.slice(0, 500) ?? null,
        trustScore: p.eeatScores?.trust?.score ?? null,
        experienceScore: p.eeatScores?.experience?.score ?? null,
        expertiseScore: p.eeatScores?.expertise?.score ?? null,
        authoritativenessScore: p.eeatScores?.authoritativeness?.score ?? null,
        trustReasoning: p.eeatScores?.trust?.reasoning?.slice(0, 300) ?? null,
        experienceReasoning: p.eeatScores?.experience?.reasoning?.slice(0, 300) ?? null,
        expertiseReasoning: p.eeatScores?.expertise?.reasoning?.slice(0, 300) ?? null,
        missingElements: (p.missingGeoElements ?? []).slice(0, 10),
        hasPrivacy: p.technical?.hasPrivacy ?? false,
        hasImpressum: p.technical?.hasImpressum ?? false,
        evidenceId: `ev-geo-page-${i}`,
    }));
}

function topCitedDomainsFromRun(
    competitiveByModel: Record<string, CompetitiveBenchmarkResult>,
    queryIndex: number
): string[] {
    const counts = new Map<string, number>();
    for (const result of Object.values(competitiveByModel)) {
        const run = result.runs?.[queryIndex];
        if (!run?.citations?.length) continue;
        for (const c of run.citations.slice(0, 5)) {
            const d = (c.domain ?? '').trim();
            if (!d) continue;
            counts.set(d, (counts.get(d) ?? 0) + 1);
        }
    }
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_CITED_DOMAINS)
        .map(([d]) => d);
}

export function buildGeoDeepAnalysis(
    payload: GeoEeatIntensiveResult | null,
    targetDomain: string,
    questionHistory: GeoQuestionHistoryFact[]
): GeoDeepAnalysisFact | null {
    const pages = mapGeoPagesDeep(payload);
    const competitiveByModel =
        payload?.competitiveByModel ??
        (payload?.competitive ? { default: payload.competitive } : null);

    const modelBenchmarks: GeoModelBenchmarkFact[] = [];
    const questionDetails: GeoQuestionDetailFact[] = [];

    if (competitiveByModel && targetDomain) {
        for (const [modelId, result] of Object.entries(competitiveByModel)) {
            const m = result.metrics?.find((x) => x.domain === targetDomain);
            const score = m ? scoreFromGeoMetrics(m) : null;
            modelBenchmarks.push({
                modelId: shortModelLabel(modelId),
                shareOfVoice: m?.shareOfVoice ?? null,
                avgPosition: m?.avgPosition ?? null,
                mentionCount: m?.mentionCount ?? null,
                queryCount: m?.queryCount ?? null,
                visibilityScore: score ?? visibilityFromMetrics(m?.avgPosition ?? null, m?.shareOfVoice ?? null),
                evidenceId: `ev-geo-model-${modelId.replace(/[^a-z0-9]+/gi, '-').slice(0, 20)}`,
            });
        }

        const { rows, modelIds } = buildPositionMatrixMultiDomain(competitiveByModel, [targetDomain]);
        for (const row of rows.slice(0, MAX_QUESTIONS)) {
            const history =
                questionHistory.find(
                    (h) =>
                        h.queryIndex === row.queryIndex ||
                        h.queryText.trim() === row.queryText.trim()
                ) ?? questionHistory[row.queryIndex - 1];

            const positionsByModel = modelIds.map((modelId) => {
                const pos = row.positionsByModelByDomain[modelId]?.[targetDomain] ?? 0;
                return {
                    modelId: shortModelLabel(modelId),
                    position: pos > 0 ? pos : null,
                    cited: pos > 0,
                };
            });

            const citedPositions = positionsByModel
                .map((p) => p.position)
                .filter((p): p is number => p != null);
            const latestPosition =
                citedPositions.length > 0
                    ? Math.round(
                          (citedPositions.reduce((a, b) => a + b, 0) / citedPositions.length) * 10
                      ) / 10
                    : history?.latestPosition ?? null;

            questionDetails.push({
                queryText: row.queryText || row.queryLabel,
                queryIndex: row.queryIndex,
                latestPosition,
                trend: history?.trend ?? 'unknown',
                positionsByModel,
                topCitedDomains: topCitedDomainsFromRun(competitiveByModel, row.queryIndex - 1),
                points: history?.points ?? [],
                evidenceId: history?.evidenceId ?? `ev-geo-query-${row.queryIndex}`,
            });
        }
    }

    if (questionDetails.length === 0 && questionHistory.length > 0) {
        for (const h of questionHistory.slice(0, MAX_QUESTIONS)) {
            questionDetails.push({
                queryText: h.queryText,
                queryIndex: h.queryIndex,
                latestPosition: h.latestPosition,
                trend: h.trend,
                positionsByModel: [],
                topCitedDomains: [],
                points: h.points,
                evidenceId: h.evidenceId,
            });
        }
    }

    if (modelBenchmarks.length === 0 && pages.length === 0 && questionDetails.length === 0) {
        return null;
    }

    const insights: GeoInsightFact[] = [];

    const notCited = questionDetails.filter(
        (q) => q.positionsByModel.length > 0 && q.positionsByModel.every((p) => !p.cited)
    );
    if (notCited.length > 0) {
        insights.push({
            id: 'geo-not-cited',
            kind: 'question',
            title: `${notCited.length} GEO queries not cited by any LLM`,
            description: notCited
                .slice(0, 3)
                .map((q) => q.queryText.slice(0, 60))
                .join('; '),
            evidenceId: notCited[0]!.evidenceId,
        });
    }

    const worstModel = [...modelBenchmarks].sort(
        (a, b) => (a.visibilityScore ?? 0) - (b.visibilityScore ?? 0)
    )[0];
    const bestModel = [...modelBenchmarks].sort(
        (a, b) => (b.visibilityScore ?? 0) - (a.visibilityScore ?? 0)
    )[0];
    if (worstModel && bestModel && worstModel.modelId !== bestModel.modelId) {
        insights.push({
            id: 'geo-model-gap',
            kind: 'model',
            title: `LLM visibility gap: ${worstModel.modelId} vs ${bestModel.modelId}`,
            description: `Lowest visibility ${worstModel.visibilityScore ?? '–'}/100 (${worstModel.modelId}), highest ${bestModel.visibilityScore ?? '–'}/100 (${bestModel.modelId}).`,
            evidenceId: worstModel.evidenceId,
        });
    }

    const weakPages = pages.filter(
        (p) => p.geoFitnessScore != null && p.geoFitnessScore < GEO_FITNESS_THRESHOLD
    );
    if (weakPages.length > 0) {
        insights.push({
            id: 'geo-weak-pages',
            kind: 'page',
            title: `${weakPages.length} pages below GEO fitness threshold (${GEO_FITNESS_THRESHOLD})`,
            description: weakPages
                .slice(0, 3)
                .map((p) => `${p.title ?? p.url} (${p.geoFitnessScore})`)
                .join('; '),
            evidenceId: weakPages[0]!.evidenceId,
        });
    }

    const lowTrust = pages.filter((p) => p.trustScore != null && p.trustScore < 3);
    if (lowTrust.length > 0) {
        insights.push({
            id: 'geo-low-trust',
            kind: 'eeat',
            title: `${lowTrust.length} pages with low trust score (<3/5)`,
            description: lowTrust
                .slice(0, 2)
                .map((p) => p.title ?? p.url)
                .join('; '),
            evidenceId: lowTrust[0]!.evidenceId,
        });
    }

    const avg = (vals: number[]) =>
        vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;

    return {
        modelBenchmarks: modelBenchmarks.sort(
            (a, b) => (b.visibilityScore ?? 0) - (a.visibilityScore ?? 0)
        ),
        questionDetails,
        pages,
        deterministicInsights: insights.slice(0, 10),
        summary: {
            modelCount: modelBenchmarks.length,
            questionCount: questionDetails.length,
            pageCount: pages.length,
            avgGeoFitness: avg(
                pages.map((p) => p.geoFitnessScore).filter((v): v is number => v != null)
            ),
            avgTrust: avg(pages.map((p) => p.trustScore).filter((v): v is number => v != null)),
            questionsNotCited: notCited.length,
            pagesBelowGeoThreshold: weakPages.length,
        },
    };
}

/** Compact payload for GEO specialist agent. */
export function buildGeoAgentPayload(
    geo: {
        score: number | null;
        recommendations: Array<{ title: string; description: string; priority?: number }>;
        competitiveDomains: Array<{ domain: string; score: number | null; avgPosition: number | null }>;
    } | null,
    geoDeep: GeoDeepAnalysisFact | null
) {
    return {
        overview: geo,
        geoDeep: geoDeep
            ? {
                  summary: geoDeep.summary,
                  modelBenchmarks: geoDeep.modelBenchmarks,
                  questionDetails: geoDeep.questionDetails.map((q) => ({
                      query: q.queryText,
                      trend: q.trend,
                      latestPosition: q.latestPosition,
                      positionsByModel: q.positionsByModel,
                      topCitedDomains: q.topCitedDomains,
                      historyPoints: q.points.slice(-8),
                  })),
                  pages: geoDeep.pages.map((p) => ({
                      url: p.url,
                      title: p.title,
                      geoFitnessScore: p.geoFitnessScore,
                      geoFitnessReasoning: p.geoFitnessReasoning,
                      eeat: {
                          trust: p.trustScore,
                          experience: p.experienceScore,
                          expertise: p.expertiseScore,
                          authoritativeness: p.authoritativenessScore,
                      },
                      reasoning: {
                          trust: p.trustReasoning,
                          experience: p.experienceReasoning,
                          expertise: p.expertiseReasoning,
                      },
                      missingElements: p.missingElements,
                      hasPrivacy: p.hasPrivacy,
                      hasImpressum: p.hasImpressum,
                  })),
                  deterministicInsights: geoDeep.deterministicInsights,
              }
            : null,
    };
}
