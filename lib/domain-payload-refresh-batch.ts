/**
 * Batch-refresh stored `domain_scans.payload` from linked single-page scans (`scans.group_id`).
 * Same path as after POST /api/scan/domain/[id]/classify (refreshDomainPayloadFromScans).
 * Does not re-crawl and does not call the classification LLM.
 */

import { and, desc, eq, type SQL } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { domainScans } from '@/lib/db/schema';
import { refreshDomainPayloadFromScans } from '@/lib/domain-scan-classify';

export type DomainPayloadRefreshCliOptions = {
    dryRun: boolean;
    userId?: string;
    domainScanId?: string;
    /** When filterByStatus is true, only rows with this `domain_scans.status`. Default: complete. */
    status: string | undefined;
    filterByStatus: boolean;
    limit?: number;
};

export type DomainPayloadRefreshCliParseResult =
    | { ok: true; options: DomainPayloadRefreshCliOptions }
    | { ok: false; help: true };

export function parseDomainPayloadRefreshCliArgs(argv: string[]): DomainPayloadRefreshCliParseResult {
    let dryRun = false;
    let userId: string | undefined;
    let domainScanId: string | undefined;
    let status: string | undefined = 'complete';
    let filterByStatus = true;
    let limit: number | undefined;

    for (const raw of argv) {
        if (raw === '--dry-run') {
            dryRun = true;
        } else if (raw === '--all-status') {
            filterByStatus = false;
            status = undefined;
        } else if (raw === '--help' || raw === '-h') {
            return { ok: false, help: true };
        } else if (raw.startsWith('--user=')) {
            userId = raw.slice('--user='.length).trim() || undefined;
        } else if (raw.startsWith('--id=')) {
            domainScanId = raw.slice('--id='.length).trim() || undefined;
        } else if (raw.startsWith('--status=')) {
            const v = raw.slice('--status='.length).trim();
            status = v || undefined;
        } else if (raw.startsWith('--limit=')) {
            const n = parseInt(raw.slice('--limit='.length), 10);
            limit = Number.isFinite(n) && n > 0 ? n : undefined;
        }
    }

    return { ok: true, options: { dryRun, userId, domainScanId, status, filterByStatus, limit } };
}

export function printDomainPayloadRefreshHelp(): void {
    console.log(`Usage: npx tsx scripts/refresh-domain-payloads.ts [options]

Rebuilds each domain scan's stored payload + aggregates from rows in \`scans\` where group_id = domain_scan id.
Requires DATABASE_URL. Does not re-run Puppeteer or topic classification LLM.

Options:
  --dry-run          List matching rows only; no DB writes
  --user=<userId>    Only domain scans owned by this user
  --id=<domainId>    Single domain scan id
  --status=<s>       With default filter: only this status (default: complete)
  --all-status       Disable status filter (all domain_scans rows)
  --limit=<n>        Max rows to process (newest first)
  -h, --help         This help
`);
}

export type DomainPayloadRefreshBatchResult = {
    examined: number;
    updated: number;
    skipped: number;
    failed: number;
};

export async function runDomainPayloadRefreshBatch(
    opts: DomainPayloadRefreshCliOptions
): Promise<DomainPayloadRefreshBatchResult> {
    const db = getDb();
    const conds: SQL[] = [];
    if (opts.userId) conds.push(eq(domainScans.userId, opts.userId));
    if (opts.domainScanId) conds.push(eq(domainScans.id, opts.domainScanId));
    if (opts.filterByStatus && opts.status) conds.push(eq(domainScans.status, opts.status));

    const whereClause = conds.length === 0 ? undefined : conds.length === 1 ? conds[0] : and(...conds);

    let q = db
        .select({
            id: domainScans.id,
            userId: domainScans.userId,
            domain: domainScans.domain,
            status: domainScans.status,
        })
        .from(domainScans);

    if (whereClause) q = q.where(whereClause);
    q = q.orderBy(desc(domainScans.timestamp));
    if (opts.limit != null) q = q.limit(opts.limit);

    const rows = await q;

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of rows) {
        if (opts.dryRun) {
            console.log(`[dry-run] ${row.id}\t${row.userId}\t${row.domain}\t${row.status}`);
            continue;
        }
        try {
            const ok = await refreshDomainPayloadFromScans(row.id, row.userId);
            if (ok) {
                updated++;
                console.log(`updated\t${row.id}\t${row.domain}`);
            } else {
                skipped++;
                console.log(`skipped\t${row.id}\t${row.domain}\t(no row or no page scans)`);
            }
        } catch (e) {
            failed++;
            console.error(`failed\t${row.id}\t${row.domain}`, e);
        }
    }

    const examined = rows.length;
    return { examined, updated, skipped, failed };
}
