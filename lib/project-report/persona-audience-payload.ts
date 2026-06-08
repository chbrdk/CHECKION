/**
 * Shared slim payloads for persona audience agents (avoid circular imports).
 */

import type { DomainFacts } from '@/lib/project-report/types';

export function slimDomainForAgent(domain: DomainFacts | null) {
    if (!domain) return null;
    return {
        domainScore: domain.score,
        wcagScore: domain.wcagScore ?? domain.score,
        seoOnPageScore: domain.seoOnPageScore,
        totalPageCount: domain.totalPageCount,
        issueStats: domain.issueStats,
        performance: domain.performance,
        systemicIssues: domain.systemicIssues.slice(0, 6).map((i) => ({
            title: i.title,
            count: i.count,
        })),
        topThemes: domain.pageClassification?.topThemes?.slice(0, 10).map((t) => ({
            tag: t.tag,
            score: t.score,
            pageCount: t.pageCount,
        })),
        llmSummary: domain.llmSummary?.summary?.slice(0, 400) ?? null,
    };
}
