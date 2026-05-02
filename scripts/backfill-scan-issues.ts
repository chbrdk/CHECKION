/**
 * One-off: populate `scan_issues` from existing `scans.result->issues` (idempotent per scan).
 * Run after migration `0019_scan_issues.sql`. Requires DATABASE_URL.
 *
 *   DATABASE_URL=... npx tsx scripts/backfill-scan-issues.ts
 */
import { getDb } from '@/lib/db/index';
import { replaceScanIssuesForScan } from '@/lib/db/scan-issues-persist';
import { scans } from '@/lib/db/schema';
import type { ScanResult } from '@/lib/types';

const BATCH = 250;

async function main() {
    const db = getDb();
    let offset = 0;
    let total = 0;
    for (;;) {
        const rows = await db
            .select({ id: scans.id, userId: scans.userId, result: scans.result })
            .from(scans)
            .limit(BATCH)
            .offset(offset);
        if (rows.length === 0) break;
        for (const row of rows) {
            const r = row.result as unknown as ScanResult;
            await replaceScanIssuesForScan(db, row.userId, row.id, r.issues);
            total++;
        }
        offset += BATCH;
        console.error(`[backfill-scan-issues] upserted ${total} scans (offset ${offset})`);
    }
    console.error(`[backfill-scan-issues] done, ${total} scans`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
