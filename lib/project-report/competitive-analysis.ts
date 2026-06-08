/**
 * Deterministic competitive benchmark from deep-scanned own domain + project competitors.
 */

import type {
    AggregatedPageClassificationTheme,
} from '@/lib/types';
import type {
    CompetitorFacts,
    CompetitiveBenchmarkFacts,
    CompetitiveInsightFact,
    CompetitorScoreComparison,
    DomainFacts,
    GeoFacts,
    ProjectReportBundle,
    RankingFacts,
    TopicOverlapRow,
    TopicOverlapThemeSnapshot,
} from '@/lib/project-report/types';

const MAX_THEMES_PER_SOURCE = 15;
const MAX_OVERLAP_ROWS = 20;
const MAX_INSIGHTS = 12;

function slugDomain(domain: string): string {
    return domain.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

function themeKey(theme: AggregatedPageClassificationTheme): string {
    return (theme.themeTagKey ?? theme.tag).trim().toLowerCase().replace(/\s+/g, ' ');
}

function snapshot(theme: AggregatedPageClassificationTheme): TopicOverlapThemeSnapshot {
    return {
        score: theme.score,
        pageCount: theme.pageCount,
        maxTier: theme.maxTier,
        avgTier: theme.avgTier,
    };
}

function rankAmong(values: Array<{ domain: string; value: number }>, ownDomain: string): number {
    const sorted = [...values].sort((a, b) => b.value - a.value);
    const idx = sorted.findIndex((v) => v.domain === ownDomain);
    return idx >= 0 ? idx + 1 : sorted.length + 1;
}

export function buildCompetitiveBenchmark(
    facts: Omit<ProjectReportBundle, 'visuals' | 'narrative' | 'deep'>
): CompetitiveBenchmarkFacts | null {
    const ownDomain = facts.project.domain ?? facts.domain?.domain ?? 'own';
    const completeCompetitors = facts.competitors.filter((c) => c.status === 'complete');
    if (!facts.domain && completeCompetitors.length === 0) return null;

    const ownDomainScore = facts.domain?.score ?? 0;
    const ownSeo = facts.domain?.seoOnPageScore ?? 0;

    const scoreboard: CompetitorScoreComparison[] = [];

    if (facts.domain) {
        scoreboard.push({
            domain: ownDomain,
            isOwn: true,
            scanStatus: 'complete',
            domainScore: facts.domain.score,
            wcagScore: facts.domain.wcagScore,
            seoOnPageScore: facts.domain.seoOnPageScore,
            totalPageCount: facts.domain.totalPageCount,
            wcagErrors: facts.domain.issueStats.errors,
            avgLcp: facts.domain.performance?.avgLcp ?? null,
            avgCo2: facts.domain.eco?.avgCo2 ?? null,
            geoScore: facts.geo?.score ?? null,
            rankingScore: facts.rankings?.score ?? null,
            domainScoreDeltaVsOwn: 0,
            seoDeltaVsOwn: 0,
            evidenceId: facts.domain.evidenceIds.domainScore,
        });
    }

    for (const comp of completeCompetitors) {
        scoreboard.push({
            domain: comp.domain,
            isOwn: false,
            scanStatus: comp.status,
            domainScore: comp.score,
            wcagScore: comp.wcagScore,
            seoOnPageScore: comp.seoOnPageScore,
            totalPageCount: comp.totalPageCount,
            wcagErrors: comp.issueStats.errors,
            avgLcp: comp.performance?.avgLcp ?? null,
            avgCo2: comp.eco?.avgCo2 ?? null,
            geoScore: facts.geo?.competitorScores[comp.domain] ?? null,
            rankingScore: facts.rankings?.competitorScores[comp.domain] ?? null,
            domainScoreDeltaVsOwn: comp.score - ownDomainScore,
            seoDeltaVsOwn: comp.seoOnPageScore - ownSeo,
            evidenceId: comp.evidenceIds.domainScore,
        });
    }

    const themeMap = new Map<
        string,
        { tag: string; own: TopicOverlapThemeSnapshot | null; competitors: Record<string, TopicOverlapThemeSnapshot> }
    >();

    const addThemes = (
        domain: string,
        themes: AggregatedPageClassificationTheme[] | undefined,
        asOwn: boolean
    ) => {
        for (const theme of (themes ?? []).slice(0, MAX_THEMES_PER_SOURCE)) {
            const key = themeKey(theme);
            const entry = themeMap.get(key) ?? { tag: theme.tag, own: null, competitors: {} };
            const snap = snapshot(theme);
            if (asOwn) entry.own = snap;
            else entry.competitors[domain] = snap;
            themeMap.set(key, entry);
        }
    };

    addThemes(ownDomain, facts.domain?.pageClassification?.topThemes, true);
    for (const comp of completeCompetitors) {
        addThemes(comp.domain, comp.pageClassification?.topThemes, false);
    }

    const topicOverlap: TopicOverlapRow[] = [...themeMap.entries()]
        .map(([key, entry]) => {
            const presentOn: string[] = [];
            if (entry.own) presentOn.push(ownDomain);
            for (const d of Object.keys(entry.competitors)) presentOn.push(d);
            return {
                themeTag: entry.tag,
                themeTagKey: key,
                own: entry.own,
                competitors: entry.competitors,
                presentOn,
                evidenceId: `ev-topic-overlap-${key.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}`,
            };
        })
        .sort((a, b) => {
            const aShared = a.presentOn.length;
            const bShared = b.presentOn.length;
            if (bShared !== aShared) return bShared - aShared;
            const aScore = (a.own?.score ?? 0) + Object.values(a.competitors).reduce((s, c) => s + c.score, 0);
            const bScore = (b.own?.score ?? 0) + Object.values(b.competitors).reduce((s, c) => s + c.score, 0);
            return bScore - aScore;
        })
        .slice(0, MAX_OVERLAP_ROWS);

    const sharedThemeCount = topicOverlap.filter((t) => t.own && Object.keys(t.competitors).length > 0).length;
    const uniqueOwnThemes = topicOverlap.filter((t) => t.own && Object.keys(t.competitors).length === 0).length;
    const themesOnlyCompetitorsHave = topicOverlap.filter((t) => !t.own && Object.keys(t.competitors).length > 0).length;

    const insights: CompetitiveInsightFact[] = [];

    if (facts.domain && completeCompetitors.length > 0) {
        const bestDomain = Math.max(...completeCompetitors.map((c) => c.score));
        const worstDomain = Math.min(...completeCompetitors.map((c) => c.score));
        if (ownDomainScore > bestDomain) {
            insights.push({
                id: 'domain-score-lead',
                kind: 'lead',
                title: 'Domain score ahead of all scanned competitors',
                description: `Own domain score ${ownDomainScore} vs best competitor ${bestDomain} (+${ownDomainScore - bestDomain} points).`,
                evidenceId: facts.domain.evidenceIds.domainScore,
            });
        } else if (ownDomainScore < worstDomain) {
            insights.push({
                id: 'domain-score-gap',
                kind: 'gap',
                title: 'Domain score behind all scanned competitors',
                description: `Own domain score ${ownDomainScore} vs weakest competitor ${worstDomain} (${ownDomainScore - worstDomain} points).`,
                evidenceId: facts.domain.evidenceIds.domainScore,
            });
        }

        const bestSeo = Math.max(...completeCompetitors.map((c) => c.seoOnPageScore));
        if (ownSeo < bestSeo) {
            const leader = completeCompetitors.find((c) => c.seoOnPageScore === bestSeo);
            insights.push({
                id: 'seo-gap',
                kind: 'gap',
                title: 'SEO on-page below leading competitor',
                description: `Own SEO ${ownSeo} vs ${leader?.domain ?? 'competitor'} ${bestSeo}.`,
                evidenceId: facts.domain.evidenceIds.seoScore,
            });
        }
    }

    for (const row of topicOverlap.filter((t) => !t.own).slice(0, 4)) {
        const domains = Object.keys(row.competitors).join(', ');
        insights.push({
            id: `topic-gap-${row.themeTagKey}`,
            kind: 'topic_gap',
            title: `Topic gap: ${row.themeTag}`,
            description: `Competitors cover this theme (${domains}); own domain has no matching top theme.`,
            evidenceId: row.evidenceId,
        });
    }

    for (const row of topicOverlap.filter((t) => t.own && Object.keys(t.competitors).length === 0).slice(0, 3)) {
        insights.push({
            id: `topic-lead-${row.themeTagKey}`,
            kind: 'topic_lead',
            title: `Unique content theme: ${row.themeTag}`,
            description: `Own domain ranks this in top themes (${row.own!.pageCount} pages, score ${Math.round(row.own!.score)}); no scanned competitor matches.`,
            evidenceId: row.evidenceId,
        });
    }

    for (const comp of completeCompetitors) {
        if (comp.llmSummary?.summary) {
            insights.push({
                id: `comp-llm-${slugDomain(comp.domain)}`,
                kind: 'parity',
                title: `${comp.domain} UX summary (scan)`,
                description: comp.llmSummary.summary.slice(0, 280),
                evidenceId: comp.evidenceIds.domainScore,
            });
        }
    }

    const domainRankValues = scoreboard.map((r) => ({ domain: r.domain, value: r.domainScore }));
    const seoRankValues = scoreboard.map((r) => ({ domain: r.domain, value: r.seoOnPageScore }));

    return {
        scoreboard,
        topicOverlap,
        deterministicInsights: insights.slice(0, MAX_INSIGHTS),
        summary: {
            completeCompetitorCount: completeCompetitors.length,
            ownDomainScoreRank: rankAmong(domainRankValues, ownDomain),
            ownSeoRank: rankAmong(seoRankValues, ownDomain),
            sharedThemeCount,
            uniqueOwnThemes,
            themesOnlyCompetitorsHave,
        },
    };
}

/** Compact payload for LLM competitive agent. */
export function buildCompetitiveAgentPayload(
    facts: Omit<ProjectReportBundle, 'visuals' | 'narrative' | 'deep'>,
    benchmark: CompetitiveBenchmarkFacts | null
) {
    return {
        benchmark,
        competitors: facts.competitors
            .filter((c) => c.status === 'complete')
            .map((c: CompetitorFacts) => ({
                domain: c.domain,
                domainScore: c.score,
                seoOnPageScore: c.seoOnPageScore,
                seoOnPageLabel: c.seoOnPageLabel,
                totalPageCount: c.totalPageCount,
                wcagErrors: c.issueStats.errors,
                avgLcp: c.performance?.avgLcp ?? null,
                avgCo2: c.eco?.avgCo2 ?? null,
                topThemes: c.pageClassification?.topThemes?.slice(0, 8).map((t) => ({
                    tag: t.tag,
                    score: t.score,
                    pageCount: t.pageCount,
                    maxTier: t.maxTier,
                })),
                systemicIssues: c.systemicIssues.slice(0, 5).map((i) => i.title),
                llmSummary: c.llmSummary?.summary?.slice(0, 400) ?? null,
            })),
        own: facts.domain
            ? {
                  domain: facts.project.domain,
                  domainScore: facts.domain.score,
                  seoOnPageScore: facts.domain.seoOnPageScore,
                  topThemes: facts.domain.pageClassification?.topThemes?.slice(0, 8),
                  llmSummary: facts.domain.llmSummary?.summary?.slice(0, 400) ?? null,
              }
            : null,
        rankings: facts.rankings?.competitorScores ?? null,
        geo: facts.geo?.competitorScores ?? null,
        deterministicInsights: benchmark?.deterministicInsights ?? [],
    };
}
