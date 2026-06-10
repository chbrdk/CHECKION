/**
 * Reader-facing interpretations for GEO & E-E-A-T KPIs (agent + deterministic fallback).
 */
import type { MetricInterpretations } from '@/lib/project-report/narrative-schema';
import type {
    GeoDeepAnalysisFact,
    GeoFacts,
    GeoInsightFact,
    ProjectReportBundle,
    ProjectReportLocale,
} from '@/lib/project-report/types';

export type GeoMetricInterpretations = {
    geoScore?: string;
    llmVisibility?: string;
    geoQuestions?: string;
    geoOnPageEeat?: string;
    geoCompetitive?: string;
    geoInsights?: string;
};

export function getGeoSectionAnalysis(
    bundle: ProjectReportBundle
): { summary: string; keyFindings: string[]; metricInterpretations?: MetricInterpretations } | null {
    const section = bundle.deep?.sections.geo ?? bundle.narrative?.sections?.geo ?? null;
    if (!section?.summary?.trim()) return null;
    return section;
}

function interpretGeoScore(score: number | null, locale: ProjectReportLocale): string {
    const de = locale === 'de';
    if (score == null) {
        return de
            ? 'Kein GEO-Gesamtscore — Einzelmetriken (Fragen, Modelle, On-Page) dennoch auswertbar.'
            : 'No overall GEO score — individual metrics (questions, models, on-page) still matter.';
    }
    if (score >= 70) {
        return de
            ? `GEO-Score ${score}/100: starke Sichtbarkeit in KI-Antworten — Ihre Domain wird bei relevanten Fragen häufig zitiert.`
            : `GEO score ${score}/100: strong visibility in AI answers — your domain is often cited for relevant queries.`;
    }
    if (score >= 50) {
        return de
            ? `GEO-Score ${score}/100: mittlere Präsenz — bei einigen Kernfragen sichtbar, bei anderen fehlen Zitationen.`
            : `GEO score ${score}/100: mid-range presence — visible for some core questions, missing citations elsewhere.`;
    }
    return de
        ? `GEO-Score ${score}/100: schwache KI-Sichtbarkeit — Wettbewerber werden häufiger in LLM-Antworten genannt.`
        : `GEO score ${score}/100: weak AI visibility — competitors are cited more often in LLM answers.`;
}

function interpretLlmVisibility(geoDeep: GeoDeepAnalysisFact | null | undefined, locale: ProjectReportLocale): string | undefined {
    if (!geoDeep || geoDeep.modelBenchmarks.length === 0) return undefined;
    const de = locale === 'de';
    const models = geoDeep.modelBenchmarks;
    const avgVisibility =
        models.reduce((sum, m) => sum + (m.visibilityScore ?? 0), 0) / models.length;
    const top = [...models].sort((a, b) => (b.visibilityScore ?? 0) - (a.visibilityScore ?? 0))[0];
    return de
        ? `${geoDeep.summary.modelCount} LLM-Modelle getestet — Ø Sichtbarkeit ${Math.round(avgVisibility)}/100. Stärkstes Modell: ${top?.modelId ?? '–'} (${top?.visibilityScore ?? '–'}).`
        : `${geoDeep.summary.modelCount} LLM models tested — avg visibility ${Math.round(avgVisibility)}/100. Strongest model: ${top?.modelId ?? '–'} (${top?.visibilityScore ?? '–'}).`;
}

function interpretGeoQuestions(geoDeep: GeoDeepAnalysisFact | null | undefined, locale: ProjectReportLocale): string | undefined {
    if (!geoDeep || geoDeep.summary.questionCount === 0) return undefined;
    const de = locale === 'de';
    const { questionCount, questionsNotCited } = geoDeep.summary;
    const cited = questionCount - questionsNotCited;
    return de
        ? `${questionCount} GEO-Testfragen — ${cited} mit Zitation Ihrer Domain, ${questionsNotCited} ohne. Fragen simulieren, was Nutzer ChatGPT & Co. fragen.`
        : `${questionCount} GEO test queries — ${cited} cite your domain, ${questionsNotCited} do not. Queries simulate what users ask ChatGPT and similar tools.`;
}

function interpretGeoOnPageEeat(geoDeep: GeoDeepAnalysisFact | null | undefined, locale: ProjectReportLocale): string | undefined {
    if (!geoDeep || geoDeep.summary.pageCount === 0) return undefined;
    const de = locale === 'de';
    const { pageCount, avgGeoFitness, avgTrust, pagesBelowGeoThreshold } = geoDeep.summary;
    return de
        ? `${pageCount} Seiten mit GEO/E-E-A-T-Analyse — Ø GEO-Fitness ${avgGeoFitness ?? '–'}/100, Vertrauen ${avgTrust ?? '–'}/5. ${pagesBelowGeoThreshold} Seite(n) unter Schwellwert.`
        : `${pageCount} pages with GEO/E-E-A-T analysis — avg GEO fitness ${avgGeoFitness ?? '–'}/100, trust ${avgTrust ?? '–'}/5. ${pagesBelowGeoThreshold} page(s) below threshold.`;
}

function formatShareOfVoicePct(share: number | null): string {
    if (share == null) return '–';
    return `${Math.round(share * 100)}%`;
}

function interpretGeoCompetitive(geo: GeoFacts, locale: ProjectReportLocale): string | undefined {
    if (geo.competitiveDomains.length === 0) return undefined;
    const de = locale === 'de';
    const sorted = [...geo.competitiveDomains].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const leader = sorted[0];
    if (!leader) return undefined;
    const sovLeader = [...geo.competitiveDomains].sort(
        (a, b) => (b.shareOfVoice ?? 0) - (a.shareOfVoice ?? 0)
    )[0];
    const sovNote =
        sovLeader && sovLeader.shareOfVoice != null
            ? de
                ? ` Höchster Share-of-Voice: ${sovLeader.domain} (${formatShareOfVoicePct(sovLeader.shareOfVoice)}).`
                : ` Highest share of voice: ${sovLeader.domain} (${formatShareOfVoicePct(sovLeader.shareOfVoice)}).`
            : '';
    return de
        ? `Wettbewerbsvergleich GEO: ${leader.domain} führt mit Score ${leader.score ?? '–'}${leader.avgPosition != null ? ` (Ø Zitationsposition ${leader.avgPosition})` : ''}.${sovNote} Die Tabelle ergänzt Score mit SoV und Ø Position pro Domain.`
        : `GEO competitive comparison: ${leader.domain} leads with score ${leader.score ?? '–'}${leader.avgPosition != null ? ` (avg citation position ${leader.avgPosition})` : ''}.${sovNote} The table adds score with SoV and avg position per domain.`;
}

function interpretGeoInsights(
    insights: GeoInsightFact[],
    locale: ProjectReportLocale
): string | undefined {
    if (insights.length === 0) return undefined;
    const de = locale === 'de';
    return de
        ? `${insights.length} automatisch erkannte GEO-Muster — wiederkehrende Lücken bei Zitationen, Modellen oder E-E-A-T-Signalen, priorisiert nach Impact.`
        : `${insights.length} automatically detected GEO patterns — recurring gaps in citations, models, or E-E-A-T signals, prioritized by impact.`;
}

export function buildFallbackGeoInterpretations(
    geo: GeoFacts | null,
    geoDeep: GeoDeepAnalysisFact | null | undefined,
    locale: ProjectReportLocale
): GeoMetricInterpretations {
    if (!geo) return {};
    const out: GeoMetricInterpretations = {
        geoScore: interpretGeoScore(geo.score, locale),
    };
    const llm = interpretLlmVisibility(geoDeep, locale);
    if (llm) out.llmVisibility = llm;
    const questions = interpretGeoQuestions(geoDeep, locale);
    if (questions) out.geoQuestions = questions;
    const onPage = interpretGeoOnPageEeat(geoDeep, locale);
    if (onPage) out.geoOnPageEeat = onPage;
    const competitive = interpretGeoCompetitive(geo, locale);
    if (competitive) out.geoCompetitive = competitive;
    const insights = interpretGeoInsights(geoDeep?.deterministicInsights ?? [], locale);
    if (insights) out.geoInsights = insights;
    return out;
}

export function resolveGeoInterpretations(bundle: ProjectReportBundle): GeoMetricInterpretations {
    const agent = getGeoSectionAnalysis(bundle)?.metricInterpretations ?? {};
    const fallback = buildFallbackGeoInterpretations(
        bundle.geo,
        bundle.deep?.geoDeep,
        bundle.locale
    );

    return {
        geoScore: agent.geoScore?.trim() || fallback.geoScore,
        llmVisibility: agent.llmVisibility?.trim() || fallback.llmVisibility,
        geoQuestions: agent.geoQuestions?.trim() || fallback.geoQuestions,
        geoOnPageEeat: agent.geoOnPageEeat?.trim() || fallback.geoOnPageEeat,
        geoCompetitive: agent.geoCompetitive?.trim() || fallback.geoCompetitive,
        geoInsights: agent.geoInsights?.trim() || fallback.geoInsights,
    };
}

export function geoInsightDescription(
    insight: GeoInsightFact,
    keyFindings: string[],
    locale: ProjectReportLocale
): string {
    const snippet = insight.title.slice(0, 16).toLowerCase();
    const matched = keyFindings.find(
        (f) =>
            f.toLowerCase().includes(snippet) ||
            insight.description.toLowerCase().includes(f.slice(0, 12).toLowerCase())
    );
    if (matched) return matched;
    if (insight.description.trim()) return insight.description;
    const de = locale === 'de';
    return de
        ? `Erkanntes Muster (${insight.kind}) — siehe Detailbeschreibung im GEO-Scan.`
        : `Detected pattern (${insight.kind}) — see GEO scan details.`;
}
