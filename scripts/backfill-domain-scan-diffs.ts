/**
 * Backfill domain_scan_diffs for completed scans with lineage_version > 1.
 *
 *   DATABASE_URL=... npx tsx scripts/backfill-domain-scan-diffs.ts
 */

import { and, eq, gt, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/index';
import { domainScanDiffs, domainScans } from '@/lib/db/schema';
import { computeAndPersistDomainScanDiff } from '@/lib/domain-scan-diff-job';

async function main(): Promise<void> {
    const db = getDb();
    const limit = Number(process.env.CHECKION_BACKFILL_DIFF_LIMIT ?? 500);

    const rows = await db
        .select({ id: domainScans.id, userId: domainScans.userId })
        .from(domainScans)
        .where(and(eq(domainScans.status, 'complete'), gt(domainScans.lineageVersion, 1)))
        .orderBy(sql`${domainScans.timestamp} DESC`)
        .limit(limit);

    let computed = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of rows) {
        const existing = await db
            .select({ id: domainScanDiffs.currentDomainScanId })
            .from(domainScanDiffs)
            .where(eq(domainScanDiffs.currentDomainScanId, row.id))
            .limit(1);
        if (existing.length > 0) {
            skipped += 1;
            continue;
        }
        try {
            const diff = await computeAndPersistDomainScanDiff({
                userId: row.userId,
                domainScanId: row.id,
                includeThemes: true,
            });
            if (diff) computed += 1;
            else skipped += 1;
        } catch (e) {
            failed += 1;
            console.error('[backfill-domain-scan-diffs]', row.id, e);
        }
    }

    console.log(JSON.stringify({ candidates: rows.length, computed, skipped, failed }, null, 2));
}

void main().catch((e) => {
    console.error(e);
    process.exit(1);
});
