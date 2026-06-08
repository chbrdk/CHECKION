/**
 * Shared domain summary (own + competitors) for project APIs and report collector.
 */

import { listDomainScanSummaries, getDomainScanWithProjectId } from '@/lib/db/scans';
import { getProjectDomainScanReferences } from '@/lib/db/project-domain-references';
import { buildDomainSummary, toLightAggregated } from '@/lib/domain-summary';
import type { AggregatedEco, AggregatedPerformance } from '@/lib/domain-aggregation';
import type { AggregatedPageClassification, DomainScanResult } from '@/lib/types';
import type { UxCxSummary } from '@/lib/llm-summary-types';
import { computeWcagScore } from '@/lib/wcag-score';
import { computeSeoOnPageScore } from '@/lib/seo-on-page-score';

export interface DomainOwnSummaryData {
    scanId: string;
    score: number;
    totalPageCount: number;
    wcagScore: number;
    seoOnPageScore: number;
    seoOnPageLabel: string;
    scannedAt: string | null;
    llmSummary: UxCxSummary | null;
    aggregated: {
        performance: AggregatedPerformance | null;
        eco: AggregatedEco | null;
        pageClassification: AggregatedPageClassification | null;
    };
    issueStats: { errors: number; warnings: number; notices: number };
    systemicIssues: Array<{ issueId: string; title: string; count: number; pages: string[] }>;
    domain: string;
}

export interface DomainCompetitorSummaryData {
    scanId: string;
    score: number;
    totalPageCount: number;
    wcagScore: number;
    seoOnPageScore: number;
    seoOnPageLabel: string;
    status: string;
    domain: string;
    issueStats: { errors: number; warnings: number; notices: number };
    systemicIssues: Array<{ issueId: string; title: string; count: number; pages: string[] }>;
    llmSummary: UxCxSummary | null;
    aggregated: {
        performance: AggregatedPerformance | null;
        eco: AggregatedEco | null;
        pageClassification: AggregatedPageClassification | null;
    };
}

function extractSummaryFromRow(row: { result: DomainScanResult }) {
    const summary = buildDomainSummary(row.result);
    const pageCount =
        summary.totalPageCount ??
        summary.pages?.length ??
        (summary as { totalPages?: number }).totalPages ??
        0;
    const issuesStats = (
        summary.aggregated as {
            issues?: { stats?: { errors?: number; warnings?: number; notices?: number } };
        }
    )?.issues?.stats;
    const wcag = computeWcagScore({
        errors: issuesStats?.errors ?? 0,
        warnings: issuesStats?.warnings ?? 0,
        notices: issuesStats?.notices ?? 0,
        totalPageCount: pageCount,
    });
    const seoOnPage = computeSeoOnPageScore({
        seo: summary.aggregated?.seo ?? null,
        structure: summary.aggregated?.structure ?? null,
    });
    const lightAgg = summary.aggregated ? toLightAggregated(summary.aggregated) : null;
    const scannedAt = summary.timestamp ?? null;
    const rawResult = row.result as DomainScanResult;
    return {
        summary,
        pageCount,
        wcag,
        seoOnPage,
        lightAgg,
        issuesStats: {
            errors: issuesStats?.errors ?? 0,
            warnings: issuesStats?.warnings ?? 0,
            notices: issuesStats?.notices ?? 0,
        },
        scannedAt,
        llmSummary: (rawResult.llmSummary as UxCxSummary | null | undefined) ?? null,
        systemicIssues: rawResult.systemicIssues ?? [],
        domain: rawResult.domain ?? '',
    };
}

export interface ProjectDomainSummaryAllData {
    own: DomainOwnSummaryData | null;
    competitors: Record<string, DomainCompetitorSummaryData | null>;
}

export async function buildProjectDomainSummaryAll(
    projectUserId: string,
    projectId: string
): Promise<ProjectDomainSummaryAllData> {
    let own: DomainOwnSummaryData | null = null;
    const summaries = await listDomainScanSummaries(projectUserId, { projectId, limit: 1 });
    if (summaries.length > 0) {
        const scanId = summaries[0]!.id;
        const row = await getDomainScanWithProjectId(scanId, projectUserId);
        if (row) {
            const extracted = extractSummaryFromRow(row);
            own = {
                scanId,
                score: extracted.summary.score ?? 0,
                totalPageCount: extracted.pageCount,
                wcagScore: extracted.wcag.score,
                seoOnPageScore: extracted.seoOnPage.score,
                seoOnPageLabel: extracted.seoOnPage.label,
                scannedAt: extracted.scannedAt,
                llmSummary: extracted.llmSummary,
                aggregated: {
                    performance: (extracted.summary.aggregated?.performance as AggregatedPerformance) ?? null,
                    eco: (extracted.summary.aggregated?.eco as AggregatedEco) ?? null,
                    pageClassification: extracted.lightAgg?.pageClassification ?? null,
                },
                issueStats: extracted.issuesStats,
                systemicIssues: extracted.systemicIssues.slice(0, 20),
                domain: extracted.domain,
            };
        }
    }

    const refs = await getProjectDomainScanReferences(projectId);
    const competitors: Record<string, DomainCompetitorSummaryData | null> = {};
    for (const ref of refs) {
        const row = await getDomainScanWithProjectId(ref.domainScanId, projectUserId);
        if (!row) {
            competitors[ref.domain] = null;
            continue;
        }
        const status = (row.result as { status?: string }).status ?? 'unknown';
        if (status !== 'complete') {
            competitors[ref.domain] = {
                scanId: ref.domainScanId,
                score: 0,
                totalPageCount: 0,
                wcagScore: 0,
                seoOnPageScore: 0,
                seoOnPageLabel: 'critical',
                status,
                domain: ref.domain,
                issueStats: { errors: 0, warnings: 0, notices: 0 },
                systemicIssues: [],
                llmSummary: null,
                aggregated: {
                    performance: null,
                    eco: null,
                    pageClassification: null,
                },
            };
            continue;
        }
        const extracted = extractSummaryFromRow(row);
        competitors[ref.domain] = {
            scanId: ref.domainScanId,
            score: extracted.summary.score ?? 0,
            totalPageCount: extracted.pageCount,
            wcagScore: extracted.wcag.score,
            seoOnPageScore: extracted.seoOnPage.score,
            seoOnPageLabel: extracted.seoOnPage.label,
            status: 'complete',
            domain: extracted.domain || ref.domain,
            issueStats: extracted.issuesStats,
            systemicIssues: extracted.systemicIssues.slice(0, 20),
            llmSummary: extracted.llmSummary,
            aggregated: {
                performance: (extracted.summary.aggregated?.performance as AggregatedPerformance) ?? null,
                eco: (extracted.summary.aggregated?.eco as AggregatedEco) ?? null,
                pageClassification: extracted.lightAgg?.pageClassification ?? null,
            },
        };
    }

    return { own, competitors };
}
