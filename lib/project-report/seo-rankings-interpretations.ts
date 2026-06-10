/**
 * Reader-facing interpretations for SEO & Rankings KPIs (agent + deterministic fallback).
 */
import type { MetricInterpretations } from '@/lib/project-report/narrative-schema';
import { interpretSerpCompetition } from '@/lib/project-report/competitive-interpretations';
import type {
    DomainFacts,
    ProjectReportBundle,
    ProjectReportLocale,
    RankingFacts,
    RankTrendSeries,
} from '@/lib/project-report/types';

export type SeoMetricInterpretations = {
    seoOnPage?: string;
    seoOnPageOverview?: string;
    serpRankingsOverview?: string;
    rankTrend?: string;
    serpCompetition?: string;
};

export function getSeoSectionAnalysis(
    bundle: ProjectReportBundle
): { summary: string; keyFindings: string[]; metricInterpretations?: MetricInterpretations } | null {
    const section =
        bundle.deep?.sections.seoRankings ?? bundle.narrative?.sections?.seoRankings ?? null;
    if (!section?.summary?.trim()) return null;
    return section;
}

function interpretSeoOnPageScore(domain: DomainFacts, locale: ProjectReportLocale): string {
    const de = locale === 'de';
    const { seoOnPageScore, seoOnPageLabel } = domain;
    if (seoOnPageScore >= 80) {
        return de
            ? `SEO On-Page ${seoOnPageScore}/100 (${seoOnPageLabel}): Titel, Meta, Überschriften und technische Basics sind gut — die Seite ist für Crawler gut lesbar.`
            : `SEO on-page ${seoOnPageScore}/100 (${seoOnPageLabel}): titles, meta, headings and technical basics are solid — the site is easy for crawlers to parse.`;
    }
    if (seoOnPageScore >= 60) {
        return de
            ? `SEO On-Page ${seoOnPageScore}/100 (${seoOnPageLabel}): solide Basis, aber Lücken bei Meta-Daten, Überschriften oder interner Verlinkung bremsen Sichtbarkeit.`
            : `SEO on-page ${seoOnPageScore}/100 (${seoOnPageLabel}): decent baseline, but gaps in meta, headings or internal links limit visibility.`;
    }
    return de
        ? `SEO On-Page ${seoOnPageScore}/100 (${seoOnPageLabel}): deutlicher Optimierungsbedarf — viele Seiten erfüllen On-Page-Grundlagen nicht zuverlässig.`
        : `SEO on-page ${seoOnPageScore}/100 (${seoOnPageLabel}): clear optimization need — many pages miss on-page fundamentals.`;
}

function interpretRankingScore(rankings: RankingFacts, locale: ProjectReportLocale): string {
    const de = locale === 'de';
    const score = rankings.score;
    if (score == null) {
        return de
            ? 'Kein aggregierter Ranking-Score — Einzelpositionen der Keywords sind dennoch aussagekräftig.'
            : 'No aggregate ranking score — individual keyword positions still matter.';
    }
    if (score >= 70) {
        return de
            ? `Ranking-Score ${score}/100: starke SERP-Präsenz bei getrackten Begriffen — organische Sichtbarkeit trägt zum Traffic bei.`
            : `Ranking score ${score}/100: strong SERP presence for tracked terms — organic visibility drives traffic.`;
    }
    if (score >= 50) {
        return de
            ? `Ranking-Score ${score}/100: mittleres Niveau — Kernkeywords ranken, Long-Tail und Wettbewerber-Begriffe brauchen Fokus.`
            : `Ranking score ${score}/100: mid-range — core keywords rank, but long-tail and competitor terms need focus.`;
    }
    return de
        ? `Ranking-Score ${score}/100: schwache organische Position — viele Keywords außerhalb der Top 10, hoher Auffholbedarf.`
        : `Ranking score ${score}/100: weak organic positions — many keywords outside the top 10, significant catch-up needed.`;
}

function countTopPositions(rankings: RankingFacts, maxPosition: number): number {
    return rankings.topKeywords.filter(
        (k) => k.position != null && k.position > 0 && k.position <= maxPosition
    ).length;
}

function interpretSerpRankingsOverview(rankings: RankingFacts, locale: ProjectReportLocale): string {
    const de = locale === 'de';
    const top10 = countTopPositions(rankings, 10);
    const top3 = countTopPositions(rankings, 3);
    const sample = rankings.topKeywords
        .slice(0, 3)
        .map((k) => `"${k.keyword}"${k.position != null ? ` (#${k.position})` : ''}`)
        .join(', ');

    const scoreLine = interpretRankingScore(rankings, locale);
    const trackingLine = de
        ? `${rankings.keywordCount} Keywords im Tracking — ${top10} in den Top 10, ${top3} in den Top 3${sample ? `. Beispiele: ${sample}` : ''}.`
        : `${rankings.keywordCount} keywords tracked — ${top10} in the top 10, ${top3} in the top 3${sample ? `. Examples: ${sample}` : ''}.`;

    return `${scoreLine} ${trackingLine}`;
}

export function summarizeRankTrends(
    rankTrends: RankTrendSeries[],
    locale: ProjectReportLocale
): string | undefined {
    if (rankTrends.length === 0) return undefined;
    const de = locale === 'de';

    let improving = 0;
    let declining = 0;
    for (const series of rankTrends) {
        const points = series.points.filter((p) => p.position != null);
        if (points.length < 2) continue;
        const first = points[0]!.position!;
        const last = points[points.length - 1]!.position!;
        if (last < first) improving += 1;
        else if (last > first) declining += 1;
    }

    if (improving > declining) {
        return de
            ? `Rank-Trends: ${improving} von ${rankTrends.length} getrackten Begriffen verbessern sich (niedrigere Position = besser). Positiver Trend für organische Sichtbarkeit.`
            : `Rank trends: ${improving} of ${rankTrends.length} tracked terms are improving (lower position = better). Positive trend for organic visibility.`;
    }
    if (declining > improving) {
        return de
            ? `Rank-Trends: ${declining} Begriffe verlieren Positionen — Wettbewerb oder Content-Lücken prüfen, bevor Rankings weiter sinken.`
            : `Rank trends: ${declining} terms are losing positions — review competition or content gaps before rankings drop further.`;
    }
    return de
        ? `Rank-Trends über ${rankTrends.length} Keywords: gemischtes Bild — einzelne Begriffe steigen, andere fallen. Priorisieren Sie Begriffe mit Business-Relevanz.`
        : `Rank trends across ${rankTrends.length} keywords: mixed — some terms rise, others fall. Prioritize business-relevant queries.`;
}

export function buildFallbackSeoInterpretations(
    domain: DomainFacts | null,
    rankings: RankingFacts | null,
    rankTrends: RankTrendSeries[],
    locale: ProjectReportLocale
): SeoMetricInterpretations {
    const out: SeoMetricInterpretations = {};
    if (domain) {
        out.seoOnPage = interpretSeoOnPageScore(domain, locale);
    }
    if (rankings) {
        out.serpRankingsOverview = interpretSerpRankingsOverview(rankings, locale);
    }
    const trend = summarizeRankTrends(rankTrends, locale);
    if (trend) out.rankTrend = trend;
    return out;
}

export function resolveSeoInterpretations(bundle: ProjectReportBundle): SeoMetricInterpretations {
    const agent = getSeoSectionAnalysis(bundle)?.metricInterpretations ?? {};
    const fallback = buildFallbackSeoInterpretations(
        bundle.domain,
        bundle.rankings,
        bundle.rankTrends ?? [],
        bundle.locale
    );
    const serpFallback = interpretSerpCompetition(
        bundle.deep?.rankKeywordDetails ?? [],
        bundle.locale
    );

    const legacySerpOverview =
        agent.serpRankingsOverview?.trim() ||
        agent.rankingScore?.trim() ||
        agent.keywords?.trim();

    return {
        seoOnPage: agent.seoOnPage?.trim() || fallback.seoOnPage,
        seoOnPageOverview: agent.seoOnPageOverview?.trim() || undefined,
        serpRankingsOverview: legacySerpOverview || fallback.serpRankingsOverview,
        rankTrend: agent.rankTrend?.trim() || fallback.rankTrend,
        serpCompetition: agent.serpCompetition?.trim() || serpFallback,
    };
}

export function keywordInsightDescription(
    keyword: string,
    position: number | null,
    keyFindings: string[],
    locale: ProjectReportLocale
): string | null {
    const snippet = keyword.slice(0, 20).toLowerCase();
    const matched = keyFindings.find((f) => f.toLowerCase().includes(snippet));
    if (matched) return matched;
    if (position == null) return null;
    const de = locale === 'de';
    if (position <= 3) {
        return de
            ? `Position #${position}: sehr sichtbar — einer der stärksten organischen Einstiegspunkte.`
            : `Position #${position}: highly visible — one of your strongest organic entry points.`;
    }
    if (position <= 10) {
        return de
            ? `Position #${position}: erste SERP-Seite — relevant für Traffic, Optimierung kann Top-3 bringen.`
            : `Position #${position}: page-one SERP — traffic-relevant; optimization could reach top 3.`;
    }
    return de
        ? `Position #${position}: außerhalb der Top 10 — Content und Links für diesen Begriff gezielt stärken.`
        : `Position #${position}: outside top 10 — strengthen content and links for this query.`;
}
