/**
 * Builds a reduced JSON payload from a DomainScanResult for the LLM.
 * Aggregates all pages and systemic issues without full page content.
 */

import type { DomainScanResult } from '@/lib/types';

const MAX_PAGES_IN_PAYLOAD = 30;
const MAX_ISSUES_PER_PAGE = 5;

export function buildDomainSummaryPayload(domainResult: DomainScanResult): Record<string, unknown> {
    const pages = (domainResult.pages ?? []).slice(0, MAX_PAGES_IN_PAYLOAD).map((page) => ({
        url: page.url,
        score: page.score,
        stats: page.stats,
        issuesCount: page.issues?.length ?? 0,
        uxScore: page.ux?.score,
        issueMessagesSample: (page.issues ?? [])
            .slice(0, MAX_ISSUES_PER_PAGE)
            .map((i) => ({ type: i.type, message: i.message.slice(0, 120), wcagLevel: i.wcagLevel })),
    }));

    const graph = domainResult.graph
        ? {
            nodeCount: domainResult.graph.nodes?.length ?? 0,
            linkCount: domainResult.graph.links?.length ?? 0,
            nodesByDepth: (domainResult.graph.nodes ?? []).reduce<Record<number, number>>((acc, n) => {
                const d = n.depth ?? 0;
                acc[d] = (acc[d] ?? 0) + 1;
                return acc;
            }, {}),
        }
        : undefined;

    return {
        domain: domainResult.domain,
        totalPages: domainResult.totalPages,
        score: domainResult.score,
        status: domainResult.status,
        pages,
        systemicIssues: domainResult.systemicIssues ?? [],
        graph,
    };
}
