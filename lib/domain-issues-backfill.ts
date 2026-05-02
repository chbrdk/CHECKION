import { getDb } from '@/lib/db';
import { and, eq, sql } from 'drizzle-orm';
import { domainIssueGroups } from '@/lib/db/schema';
import { listScansByGroupIdOmitImageBlobs } from '@/lib/db/scans';
import { rebuildDomainIssuesFromPages } from '@/lib/db/domain-issues';
import { listScanIssuesForScanIds } from '@/lib/db/scan-issues-persist';
import type { Issue, ScanResult } from '@/lib/types';

/**
 * When `scan_issues` has rows for a page scan id, use them instead of `ScanResult.issues` from JSON
 * (e.g. after `scripts:backfill-scan-issues` or when JSON is stale).
 */
export function mergePageResultsPreferringScanIssuesTable(
    pages: ScanResult[],
    issuesByScanId: Map<string, Issue[]>
): ScanResult[] {
    return pages.map((p) => {
        if (!p.id) return p;
        const fromTable = issuesByScanId.get(p.id);
        if (fromTable && fromTable.length > 0) {
            return { ...p, issues: fromTable };
        }
        return p;
    });
}

/**
 * On-demand backfill for legacy domain scans that predate domain_* issue tables.
 * This is safe to call multiple times; it will no-op if groups already exist.
 */
export async function ensureDomainIssueTablesBackfilled(params: { userId: string; domainScanId: string }): Promise<void> {
    const db = getDb();
    const existing = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(domainIssueGroups)
        .where(and(eq(domainIssueGroups.userId, params.userId), eq(domainIssueGroups.domainScanId, params.domainScanId)));
    const count = Number(existing[0]?.count ?? 0);
    if (count > 0) return;

    const pages = await listScansByGroupIdOmitImageBlobs(params.userId, params.domainScanId);
    if (!pages || pages.length === 0) return;

    const scanIds = pages.map((p) => p.id).filter((id): id is string => Boolean(id));
    const byScanId = await listScanIssuesForScanIds(db, scanIds);
    const merged = mergePageResultsPreferringScanIssuesTable(pages, byScanId);

    await rebuildDomainIssuesFromPages({ userId: params.userId, domainScanId: params.domainScanId, pages: merged });
}
