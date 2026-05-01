/**
 * Slim DTO for deep-scan compare UI (two scans side by side). Built from stored payload via {@link buildDomainSummary}.
 */

import { buildDomainSummary } from '@/lib/domain-summary';
import type { DomainScanResult } from '@/lib/types';

export type DomainCompareIssueStats = {
    errors: number;
    warnings: number;
    notices: number;
    total: number;
};

export type DomainCompareThemeRow = {
    tag: string;
    themeTagKey?: string;
    score: number;
    pageCount: number;
};

export type DomainScanCompareDto = {
    id: string;
    domain: string;
    timestamp: string;
    status: string;
    score: number;
    totalPages: number;
    issueStats: DomainCompareIssueStats | null;
    uxScore: number | null;
    topThemes: DomainCompareThemeRow[];
};

const TOP_THEMES_CAP = 8;

export function buildDomainScanCompareDto(scan: DomainScanResult): DomainScanCompareDto {
    const summary = buildDomainSummary(scan);
    const agg = summary.aggregated;
    const issueStats = agg?.issues?.stats
        ? {
              errors: agg.issues.stats.errors,
              warnings: agg.issues.stats.warnings,
              notices: agg.issues.stats.notices,
              total: agg.issues.stats.total,
          }
        : null;
    const uxScore = agg?.ux?.score ?? null;
    const topThemes = (agg?.pageClassification?.topThemes ?? []).slice(0, TOP_THEMES_CAP).map((t) => ({
        tag: t.tag,
        ...(t.themeTagKey ? { themeTagKey: t.themeTagKey } : {}),
        score: t.score,
        pageCount: t.pageCount,
    }));
    return {
        id: summary.id,
        domain: summary.domain,
        timestamp: summary.timestamp,
        status: summary.status,
        score: summary.score,
        totalPages: summary.totalPages,
        issueStats,
        uxScore,
        topThemes,
    };
}
