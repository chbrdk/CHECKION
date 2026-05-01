/**
 * Assign lineage_key + lineage_version for existing domain_scans so re-scans group and list queries show one row per lineage.
 *
 *   DATABASE_URL=... npx tsx scripts/backfill-domain-scan-lineage.ts
 *
 * Safe to re-run: recomputes keys from user_id, project_id, domain (normalized) and versions by timestamp order.
 */

import { eq } from 'drizzle-orm';
import { buildDomainScanLineageKey } from '@/lib/domain-scan-lineage';
import { getDb } from '@/lib/db/index';
import { domainScans } from '@/lib/db/schema';

type Row = {
    id: string;
    userId: string;
    projectId: string | null;
    domain: string;
    timestamp: string;
};

async function main(): Promise<void> {
    const db = getDb();
    const rows: Row[] = await db
        .select({
            id: domainScans.id,
            userId: domainScans.userId,
            projectId: domainScans.projectId,
            domain: domainScans.domain,
            timestamp: domainScans.timestamp,
        })
        .from(domainScans);

    const groups = new Map<string, Row[]>();
    for (const r of rows) {
        const key = buildDomainScanLineageKey(r.userId, r.projectId, r.domain);
        const arr = groups.get(key) ?? [];
        arr.push(r);
        groups.set(key, arr);
    }

    let updated = 0;
    for (const [lineageKey, arr] of groups) {
        arr.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        let version = 0;
        for (const r of arr) {
            version += 1;
            await db
                .update(domainScans)
                .set({ lineageKey, lineageVersion: version })
                .where(eq(domainScans.id, r.id));
            updated += 1;
        }
    }

    console.log(JSON.stringify({ rows: rows.length, lineages: groups.size, updates: updated }, null, 2));
}

void main().catch((e) => {
    console.error(e);
    process.exit(1);
});
