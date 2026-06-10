/**
 * Reader-facing interpretations for competitive benchmark tables (agent + deterministic fallback).
 */
import type { MetricInterpretations } from '@/lib/project-report/narrative-schema';
import type {
    CompetitiveBenchmarkFacts,
    CompetitiveInsightFact,
    ProjectReportBundle,
    ProjectReportLocale,
    RankKeywordDetailFact,
} from '@/lib/project-report/types';
import {
    classifyTopicOverlapRow,
    prioritizeTopicOverlapRows,
    shortenPdfDomain,
    stripPdfEvidenceMarkers,
} from '@/lib/project-report/pdf-competitive-display';

export const COMPETITIVE_INSIGHT_METRIC_PREFIX = 'insight:';

export type CompetitiveMetricInterpretations = {
    competitiveOverview?: string;
    scoreboard?: string;
    topicOverlap?: string;
    insightsOverview?: string;
};

export function competitiveInsightMetricKey(insightId: string): string {
    return `${COMPETITIVE_INSIGHT_METRIC_PREFIX}${insightId}`;
}

export function getCompetitiveSectionAnalysis(
    bundle: ProjectReportBundle
): { summary: string; keyFindings: string[]; metricInterpretations?: MetricInterpretations } | null {
    const section = bundle.deep?.sections.competitive ?? bundle.narrative?.sections?.competitive ?? null;
    if (!section?.summary?.trim()) return null;
    return section;
}

function getCompetitiveSection(bundle: ProjectReportBundle) {
    return bundle.deep?.sections.competitive ?? bundle.narrative?.sections?.competitive ?? null;
}

function matchKeyFindingForInsight(insight: CompetitiveInsightFact, keyFindings: string[]): string | undefined {
    const titleSnippet = insight.title.slice(0, 20).toLowerCase();
    const themeFromId = insight.id.replace(/^topic-(gap|lead)-/, '').replace(/-/g, ' ');
    return keyFindings.find((finding) => {
        const lower = finding.toLowerCase();
        return (
            lower.includes(titleSnippet) ||
            (themeFromId.length > 2 && lower.includes(themeFromId)) ||
            insight.description.toLowerCase().includes(finding.slice(0, 16).toLowerCase())
        );
    });
}

function fallbackCompetitiveInsightInterpretation(
    insight: CompetitiveInsightFact,
    locale: ProjectReportLocale
): string {
    const de = locale === 'de';
    const base = stripPdfEvidenceMarkers(insight.description);
    const suffixByKind: Record<CompetitiveInsightFact['kind'], string> = de
        ? {
              lead: 'Nutzen Sie den Vorsprung in Kommunikation und Conversion.',
              gap: 'Priorisieren, wenn es Kern-Leistungen oder Suchintentionen betrifft.',
              parity: 'Parität reicht selten — Differenzierung in Tiefe oder UX prüfen.',
              topic_gap: 'Content- und SEO-Lücke: Wettbewerber sind für dieses Thema sichtbar.',
              topic_lead: 'Alleinstellung ausbauen, bevor Wettbewerber nachziehen.',
          }
        : {
              lead: 'Leverage this lead in messaging and conversion.',
              gap: 'Prioritize if it affects core services or search intent.',
              parity: 'Parity is rarely enough — check differentiation in depth or UX.',
              topic_gap: 'Content and SEO gap: competitors are visible for this theme.',
              topic_lead: 'Expand this unique theme before competitors catch up.',
          };
    const suffix = suffixByKind[insight.kind];
    return base ? `${base} ${suffix}` : suffix;
}

function interpretCompetitiveInsightsOverview(
    insights: CompetitiveInsightFact[],
    locale: ProjectReportLocale
): string | undefined {
    if (insights.length === 0) return undefined;
    const de = locale === 'de';
    const gaps = insights.filter((i) => i.kind === 'gap' || i.kind === 'topic_gap').length;
    const leads = insights.filter((i) => i.kind === 'lead' || i.kind === 'topic_lead').length;
    return de
        ? `${insights.length} automatisch erkannte Wettbewerbs-Signale — ${gaps} Lücke(n), ${leads} Vorsprung/Vorteil. Jede Karte erklärt Auswirkung und Priorität.`
        : `${insights.length} automatically detected competitive signals — ${gaps} gap(s), ${leads} lead(s). Each card explains impact and priority.`;
}

export function competitiveInsightDescription(
    insight: CompetitiveInsightFact,
    bundle: ProjectReportBundle
): string {
    const section = getCompetitiveSection(bundle);
    const agentText = section?.metricInterpretations?.[competitiveInsightMetricKey(insight.id)]?.trim();
    if (agentText) return stripPdfEvidenceMarkers(agentText);

    const matched = matchKeyFindingForInsight(insight, section?.keyFindings ?? []);
    if (matched) return stripPdfEvidenceMarkers(matched);

    return fallbackCompetitiveInsightInterpretation(insight, bundle.locale);
}

function interpretCompetitiveOverview(
    benchmark: CompetitiveBenchmarkFacts,
    locale: ProjectReportLocale
): string {
    const de = locale === 'de';
    const { ownDomainScoreRank, ownSeoRank, uniqueOwnThemes, themesOnlyCompetitorsHave, completeCompetitorCount } =
        benchmark.summary;
    return de
        ? `Domain-Rang #${ownDomainScoreRank}, SEO-Rang #${ownSeoRank} von ${completeCompetitorCount + 1} gescannten Domains. ${uniqueOwnThemes} eigene Top-Themen, ${themesOnlyCompetitorsHave} Themenfelder nur beim Wettbewerb — strategische Lücken und Alleinstellungen auf einen Blick.`
        : `Domain rank #${ownDomainScoreRank}, SEO rank #${ownSeoRank} of ${completeCompetitorCount + 1} scanned domains. ${uniqueOwnThemes} unique top themes, ${themesOnlyCompetitorsHave} competitor-only themes — strategic gaps and strengths at a glance.`;
}

function interpretScoreboard(
    benchmark: CompetitiveBenchmarkFacts,
    locale: ProjectReportLocale
): string {
    const de = locale === 'de';
    const own = benchmark.scoreboard.find((row) => row.isOwn);
    if (!own) return de ? 'Kein Scoreboard verfügbar.' : 'No scoreboard available.';

    const competitors = benchmark.scoreboard.filter((row) => !row.isOwn);
    const seoLeader = [...competitors].sort((a, b) => b.seoOnPageScore - a.seoOnPageScore)[0];
    const wcagLeader = [...competitors].sort(
        (a, b) => (a.wcagErrors ?? Number.MAX_SAFE_INTEGER) - (b.wcagErrors ?? Number.MAX_SAFE_INTEGER)
    )[0];
    const domainLeader = [...competitors].sort((a, b) => b.domainScore - a.domainScore)[0];

    const parts: string[] = [];
    if (domainLeader && own.domainScore < domainLeader.domainScore) {
        parts.push(
            de
                ? `UX/Domain-Score ${own.domainScore} vs. ${shortenPdfDomain(domainLeader.domain)} ${domainLeader.domainScore} (−${domainLeader.domainScore - own.domainScore})`
                : `UX/domain score ${own.domainScore} vs ${shortenPdfDomain(domainLeader.domain)} ${domainLeader.domainScore} (−${domainLeader.domainScore - own.domainScore})`
        );
    }
    if (seoLeader && own.seoOnPageScore < seoLeader.seoOnPageScore) {
        parts.push(
            de
                ? `SEO ${own.seoOnPageScore} vs. ${shortenPdfDomain(seoLeader.domain)} ${seoLeader.seoOnPageScore}`
                : `SEO ${own.seoOnPageScore} vs ${shortenPdfDomain(seoLeader.domain)} ${seoLeader.seoOnPageScore}`
        );
    }
    if (
        wcagLeader &&
        own.wcagErrors != null &&
        wcagLeader.wcagErrors != null &&
        own.wcagErrors > wcagLeader.wcagErrors
    ) {
        parts.push(
            de
                ? `WCAG-Fehler ${own.wcagErrors} vs. ${shortenPdfDomain(wcagLeader.domain)} ${wcagLeader.wcagErrors}`
                : `WCAG errors ${own.wcagErrors} vs ${shortenPdfDomain(wcagLeader.domain)} ${wcagLeader.wcagErrors}`
        );
    }

    if (parts.length === 0) {
        return de
            ? 'Im Scoreboard liegt die eigene Domain in den gescannten Kennzahlen vorne oder auf Augenhöhe — Details in UX, SEO, GEO, Ranking, WCAG und LCP.'
            : 'In the scoreboard your domain leads or matches scanned competitors — see UX, SEO, GEO, ranking, WCAG, and LCP columns.';
    }

    return de
        ? `Scoreboard-Kern: ${parts.join(' · ')}. Die Tabelle vergleicht alle Säulen nebeneinander — nicht nur Domain- und SEO-Score.`
        : `Scoreboard highlights: ${parts.join(' · ')}. The table compares all pillars side by side — not only domain and SEO scores.`;
}

function interpretTopicOverlap(
    benchmark: CompetitiveBenchmarkFacts,
    locale: ProjectReportLocale
): string {
    const de = locale === 'de';
    const rows = prioritizeTopicOverlapRows(benchmark.topicOverlap);
    const gaps = rows.filter((row) => classifyTopicOverlapRow(row) === 'gap').slice(0, 2);
    const leads = rows.filter((row) => classifyTopicOverlapRow(row) === 'lead').slice(0, 2);

    if (gaps.length === 0 && leads.length === 0) {
        return de
            ? 'Themen-Overlap zeigt vor allem gemeinsame Content-Felder mit dem Wettbewerb — Differenzierung eher in Tiefe und Qualität als in fehlenden Themen.'
            : 'Topic overlap shows mostly shared content areas with competitors — differentiation is more about depth and quality than missing themes.';
    }

    const gapText = gaps.map((g) => g.themeTag).join(', ');
    const leadText = leads.map((l) => l.themeTag).join(', ');
    const chunks: string[] = [];
    if (gapText) {
        chunks.push(de ? `Lücken: ${gapText}` : `Gaps: ${gapText}`);
    }
    if (leadText) {
        chunks.push(de ? `Alleinstellung: ${leadText}` : `Unique strengths: ${leadText}`);
    }
    return de
        ? `Content-Themen: ${chunks.join(' · ')}. „Lücke“ = Wettbewerber decken das Thema ab, Sie nicht; „Alleinstellung“ = umgekehrt.`
        : `Content themes: ${chunks.join(' · ')}. “Gap” = competitors cover the theme, you do not; “unique” = the reverse.`;
}

export function interpretSerpCompetition(
    details: RankKeywordDetailFact[],
    locale: ProjectReportLocale
): string | undefined {
    const ranked = details.filter((row) => row.position != null && row.position > 0);
    if (ranked.length === 0) return undefined;

    const de = locale === 'de';
    const leaders = new Map<string, number>();
    for (const row of ranked) {
        if (!row.serpLeaderDomain) continue;
        const key = shortenPdfDomain(row.serpLeaderDomain);
        leaders.set(key, (leaders.get(key) ?? 0) + 1);
    }
    const topLeader = [...leaders.entries()].sort((a, b) => b[1] - a[1])[0];
    const ownTop = ranked.filter((row) => row.position != null && row.position <= 3);

    return de
        ? `${ranked.length} Keywords mit messbarer Position${topLeader ? ` — häufigster SERP-Leader: ${topLeader[0]} (${topLeader[1]}×)` : ''}${ownTop.length > 0 ? `, ${ownTop.length} in den Top 3` : ''}. Die Tabelle zeigt, wer die SERPs dominiert, auch wenn Ihre Domain punktuell führt.`
        : `${ranked.length} keywords with measurable positions${topLeader ? ` — most common SERP leader: ${topLeader[0]} (${topLeader[1]}×)` : ''}${ownTop.length > 0 ? `, ${ownTop.length} in the top 3` : ''}. The table shows who dominates SERPs even when you rank for individual terms.`;
}

export function buildFallbackCompetitiveInterpretations(
    benchmark: CompetitiveBenchmarkFacts | null | undefined,
    locale: ProjectReportLocale
): CompetitiveMetricInterpretations {
    if (!benchmark || benchmark.scoreboard.length === 0) return {};
    const insightsOverview = interpretCompetitiveInsightsOverview(
        benchmark.deterministicInsights,
        locale
    );
    return {
        competitiveOverview: interpretCompetitiveOverview(benchmark, locale),
        scoreboard: interpretScoreboard(benchmark, locale),
        topicOverlap: interpretTopicOverlap(benchmark, locale),
        ...(insightsOverview ? { insightsOverview } : {}),
    };
}

export function resolveCompetitiveInterpretations(
    bundle: ProjectReportBundle
): CompetitiveMetricInterpretations {
    const agent = getCompetitiveSectionAnalysis(bundle)?.metricInterpretations ?? {};
    const fallback = buildFallbackCompetitiveInterpretations(
        bundle.deep?.competitiveBenchmark,
        bundle.locale
    );

    return {
        competitiveOverview: agent.competitiveOverview?.trim() || fallback.competitiveOverview,
        scoreboard: agent.scoreboard?.trim() || fallback.scoreboard,
        topicOverlap: agent.topicOverlap?.trim() || fallback.topicOverlap,
        insightsOverview: agent.insightsOverview?.trim() || fallback.insightsOverview,
    };
}
