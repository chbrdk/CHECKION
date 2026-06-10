/**
 * Formatting helpers for competitive / SERP tables in project report PDFs.
 */
import type {
    CompetitiveInsightFact,
    GeoCompetitiveDomainFact,
    RankKeywordDetailFact,
    RankingKeywordFact,
    SeoRollupFacts,
    TopicOverlapRow,
} from '@/lib/project-report/types';
import type { ProjectReportLocale } from '@/lib/project-report/types';

export const PDF_RANKING_CHART_MIN_POSITIONED_KEYWORDS = 3;
export const PDF_TOPIC_OVERLAP_TABLE_LIMIT = 12;
export const PDF_KEYWORD_SERP_TABLE_LIMIT = 8;
export const PDF_COMPETITIVE_INSIGHT_CARD_LIMIT = 3;

const COMPETITIVE_INSIGHT_CARD_KINDS = new Set<CompetitiveInsightFact['kind']>(['gap', 'topic_gap']);

const COMPETITIVE_INSIGHT_CARD_PRIORITY: Record<CompetitiveInsightFact['kind'], number> = {
    topic_gap: 0,
    gap: 1,
    topic_lead: 2,
    lead: 3,
    parity: 4,
};

/** Top gap insights as cards — leads and parity stay in the overlap table only. */
export function selectCompetitiveInsightsForPdf(
    insights: CompetitiveInsightFact[],
    limit = PDF_COMPETITIVE_INSIGHT_CARD_LIMIT
): CompetitiveInsightFact[] {
    return [...insights]
        .filter((insight) => COMPETITIVE_INSIGHT_CARD_KINDS.has(insight.kind))
        .sort(
            (a, b) =>
                COMPETITIVE_INSIGHT_CARD_PRIORITY[a.kind] - COMPETITIVE_INSIGHT_CARD_PRIORITY[b.kind]
        )
        .slice(0, limit);
}

export function shortenPdfDomain(domain: string): string {
    return domain.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
}

/** Remove inline evidence markers leaked from LLM key findings. */
export function stripPdfEvidenceMarkers(text: string): string {
    return text
        .replace(/\s*\(ev-[a-z0-9-]+\)/gi, '')
        .replace(/\s+ev-[a-z0-9-]+\s*$/gi, '')
        .trim();
}

export function formatCompetitiveInsightKind(
    kind: CompetitiveInsightFact['kind'],
    locale: ProjectReportLocale
): string {
    const de: Record<CompetitiveInsightFact['kind'], string> = {
        lead: 'Vorsprung',
        gap: 'Lücke',
        parity: 'Parität',
        topic_gap: 'Themen-Lücke',
        topic_lead: 'Themen-Vorsprung',
    };
    const en: Record<CompetitiveInsightFact['kind'], string> = {
        lead: 'Lead',
        gap: 'Gap',
        parity: 'Parity',
        topic_gap: 'Topic gap',
        topic_lead: 'Topic lead',
    };
    return (locale === 'de' ? de : en)[kind];
}

export function formatFindingSeverity(
    severity: string | undefined,
    locale: ProjectReportLocale
): string {
    const key = (severity ?? 'info').toLowerCase();
    const de: Record<string, string> = {
        high: 'hoch',
        medium: 'mittel',
        low: 'niedrig',
        info: 'info',
    };
    const en: Record<string, string> = {
        high: 'high',
        medium: 'medium',
        low: 'low',
        info: 'info',
    };
    return (locale === 'de' ? de : en)[key] ?? key;
}

export function countPositionedKeywords(
    keywords: Array<{ position: number | null }>
): number {
    return keywords.filter((kw) => kw.position != null && kw.position > 0).length;
}

export function shouldShowRankingKeywordChart(
    keywords: Array<{ position: number | null }>,
    min = PDF_RANKING_CHART_MIN_POSITIONED_KEYWORDS
): boolean {
    return countPositionedKeywords(keywords) >= min;
}

export function hasSeoRollupData(rollup: SeoRollupFacts | null | undefined): boolean {
    if (!rollup) return false;
    return [
        rollup.pagesMissingTitle,
        rollup.pagesMissingMeta,
        rollup.pagesMissingH1,
        rollup.duplicateTitles,
        rollup.brokenLinksCount,
        rollup.jsonLdPages,
    ].some((value) => value != null && value > 0);
}

export type TopicOverlapStatus = 'gap' | 'lead' | 'shared';

export function classifyTopicOverlapRow(row: TopicOverlapRow): TopicOverlapStatus {
    const hasOwn = Boolean(row.own && row.own.score > 0);
    const hasCompetitors = Object.keys(row.competitors).length > 0;
    if (!hasOwn && hasCompetitors) return 'gap';
    if (hasOwn && !hasCompetitors) return 'lead';
    return 'shared';
}

export function bestCompetitorForTheme(row: TopicOverlapRow): {
    domain: string;
    score: number;
} | null {
    let best: { domain: string; score: number } | null = null;
    for (const [domain, snapshot] of Object.entries(row.competitors)) {
        if (!best || snapshot.score > best.score) {
            best = { domain, score: snapshot.score };
        }
    }
    return best;
}

export function prioritizeTopicOverlapRows(rows: TopicOverlapRow[]): TopicOverlapRow[] {
    const statusRank: Record<TopicOverlapStatus, number> = { gap: 0, lead: 1, shared: 2 };
    return [...rows]
        .sort((a, b) => {
            const statusDelta =
                statusRank[classifyTopicOverlapRow(a)] - statusRank[classifyTopicOverlapRow(b)];
            if (statusDelta !== 0) return statusDelta;
            const aScore = (a.own?.score ?? 0) + Object.values(a.competitors).reduce((s, c) => s + c.score, 0);
            const bScore = (b.own?.score ?? 0) + Object.values(b.competitors).reduce((s, c) => s + c.score, 0);
            return bScore - aScore;
        })
        .slice(0, PDF_TOPIC_OVERLAP_TABLE_LIMIT);
}

export function selectKeywordSerpRows(
    details: RankKeywordDetailFact[],
    limit = PDF_KEYWORD_SERP_TABLE_LIMIT
): RankKeywordDetailFact[] {
    return [...details]
        .sort((a, b) => {
            const aPos = a.position ?? 999;
            const bPos = b.position ?? 999;
            if (aPos !== bPos) return aPos - bPos;
            return a.keyword.localeCompare(b.keyword);
        })
        .slice(0, limit);
}

export function topKeywordsWithPosition(
    keywords: RankingKeywordFact[],
    limit = 5
): RankingKeywordFact[] {
    return keywords
        .filter((kw) => kw.position != null && kw.position > 0)
        .slice(0, limit);
}

export function formatGeoShareOfVoice(share: number | null | undefined): string {
    if (share == null) return '–';
    return `${Math.round(share * 100)}%`;
}

export function formatGeoAvgPosition(position: number | null | undefined): string {
    if (position == null) return '–';
    return position.toFixed(1);
}

export function sortGeoCompetitiveDomains(
    domains: GeoCompetitiveDomainFact[]
): GeoCompetitiveDomainFact[] {
    return [...domains].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}
