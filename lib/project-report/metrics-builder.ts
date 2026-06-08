/**
 * Deterministic KPI metrics from collected report facts.
 */

import type {
    CompetitorFacts,
    DomainFacts,
    GeoFacts,
    MetricInsight,
    ProjectReportBundle,
    RankingFacts,
} from '@/lib/project-report/types';

export function buildMetricInsights(
    facts: Omit<ProjectReportBundle, 'visuals' | 'narrative' | 'deep'>
): MetricInsight[] {
    const metrics: MetricInsight[] = [];

    const push = (m: MetricInsight) => metrics.push(m);

    if (facts.domain) {
        const d = facts.domain;
        push({
            id: 'wcag-score',
            pillar: 'wcag',
            label: 'WCAG Score',
            value: d.wcagScore,
            unit: '/100',
            benchmark: d.wcagScore >= 80 ? 'good' : d.wcagScore >= 60 ? 'fair' : 'critical',
            evidenceId: d.evidenceIds.wcagScore,
        });
        push({
            id: 'wcag-errors',
            pillar: 'wcag',
            label: 'WCAG Errors (site-wide)',
            value: d.issueStats.errors,
            evidenceId: 'ev-wcag-errors',
        });
        push({
            id: 'wcag-warnings',
            pillar: 'wcag',
            label: 'WCAG Warnings',
            value: d.issueStats.warnings,
            evidenceId: 'ev-wcag-warnings',
        });
        push({
            id: 'seo-onpage',
            pillar: 'seo',
            label: 'SEO On-Page Score',
            value: d.seoOnPageScore,
            unit: '/100',
            benchmark: d.seoOnPageLabel,
            evidenceId: d.evidenceIds.seoScore,
        });
        push({
            id: 'domain-score',
            pillar: 'wcag',
            label: 'Domain Scan Score',
            value: d.score,
            unit: '/100',
            evidenceId: d.evidenceIds.domainScore,
        });
        push({
            id: 'pages-scanned',
            pillar: 'wcag',
            label: 'Pages scanned',
            value: d.totalPageCount,
            evidenceId: 'ev-domain-pages',
        });
        if (d.performance?.avgLcp != null) {
            push({
                id: 'perf-lcp',
                pillar: 'performance',
                label: 'Avg LCP',
                value: d.performance.avgLcp,
                unit: 'ms',
                benchmark: d.performance.avgLcp <= 2500 ? 'good' : 'needs improvement',
                evidenceId: 'ev-perf-lcp',
            });
        }
        if (d.eco?.avgCo2 != null) {
            push({
                id: 'eco-co2',
                pillar: 'eco',
                label: 'Avg CO₂ per page view',
                value: d.eco.avgCo2,
                unit: 'g',
                evidenceId: 'ev-eco-co2',
            });
        }
    }

    if (facts.rankings) {
        const r = facts.rankings;
        push({
            id: 'ranking-score',
            pillar: 'rankings',
            label: 'Ranking Score',
            value: r.score,
            unit: '/100',
            evidenceId: r.evidenceId,
        });
        push({
            id: 'keyword-count',
            pillar: 'rankings',
            label: 'Tracked keywords',
            value: r.keywordCount,
            evidenceId: 'ev-keyword-count',
        });
    }

    if (facts.geo) {
        const g = facts.geo;
        push({
            id: 'geo-score',
            pillar: 'geo',
            label: 'GEO Competitive Score',
            value: g.score,
            unit: '/100',
            evidenceId: g.evidenceId,
        });
        for (const [domain, score] of Object.entries(g.competitorScores).slice(0, 5)) {
            push({
                id: `geo-comp-score-${domain}`,
                pillar: 'competitive',
                label: `GEO score: ${domain}`,
                value: score,
                unit: '/100',
                evidenceId: `ev-geo-comp-${domain.replace(/[^a-z0-9]+/gi, '-')}`,
            });
        }
    }

    for (const c of facts.competitors.filter((x) => x.status === 'complete').slice(0, 5)) {
        push({
            id: `comp-wcag-${c.domain}`,
            pillar: 'competitive',
            label: `Competitor WCAG: ${c.domain}`,
            value: c.wcagScore,
            unit: '/100',
            evidenceId: c.evidenceId,
        });
    }

    if (facts.rankings?.competitorScores) {
        for (const [domain, score] of Object.entries(facts.rankings.competitorScores).slice(0, 5)) {
            push({
                id: `rank-comp-${domain}`,
                pillar: 'competitive',
                label: `Ranking score: ${domain}`,
                value: score,
                unit: '/100',
                evidenceId: `ev-rank-comp-${domain.replace(/[^a-z0-9]+/gi, '-')}`,
            });
        }
    }

    if (facts.rankings?.competitorScores) {
        const ownRank = facts.rankings.score;
        if (ownRank != null) {
            const compScores = Object.values(facts.rankings.competitorScores);
            if (compScores.length > 0) {
                const best = Math.max(...compScores);
                push({
                    id: 'ranking-vs-best-competitor',
                    pillar: 'competitive',
                    label: 'Ranking score vs best competitor',
                    value: ownRank - best,
                    unit: ' pts',
                    benchmark: ownRank >= best ? 'leading' : 'trailing',
                    evidenceId: facts.rankings.evidenceId,
                });
            }
        }
    }

    return metrics;
}
