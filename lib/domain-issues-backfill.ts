import { getDb } from '@/lib/db';
import { and, eq, sql } from 'drizzle-orm';
import { domainIssueGroups } from '@/lib/db/schema';
import { listScansByGroupId } from '@/lib/db/scans';
import { rebuildDomainIssuesFromPages } from '@/lib/db/domain-issues';

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

    const pages = await listScansByGroupId(params.userId, params.domainScanId);
    if (!pages || pages.length === 0) return;
    await rebuildDomainIssuesFromPages({ userId: params.userId, domainScanId: params.domainScanId, pages });
}

