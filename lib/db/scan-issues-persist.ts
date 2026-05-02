/**
 * Persist WCAG issues for a `scans` row in `scan_issues` (parallel to `result.issues` JSON).
 */
import { v4 as uuidv4 } from 'uuid';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Issue } from '@/lib/types';
import { chunkArray } from '@/lib/array-chunk';
import { issueToFlatColumns } from '@/lib/wcag-issue-flat';
import { scanIssues } from '@/lib/db/schema';
import type { Db, DbClient } from '@/lib/db';

const INSERT_CHUNK = 500;
const SCAN_ID_IN_BATCH = 300;

function scanIssueRowToIssue(r: typeof scanIssues.$inferSelect): Issue {
    return {
        code: r.code,
        type: r.type as Issue['type'],
        message: r.message,
        context: r.context,
        selector: r.selector,
        runner: r.runner as Issue['runner'],
        wcagLevel: r.wcagLevel as Issue['wcagLevel'],
        helpUrl: r.helpUrl,
        boundingBox: r.boundingBox as Issue['boundingBox'],
    };
}

/** Replace all issue rows for a scan (idempotent). */
export async function replaceScanIssuesForScan(
    db: DbClient,
    userId: string,
    scanId: string,
    issues: Issue[] | undefined
): Promise<void> {
    await db.delete(scanIssues).where(eq(scanIssues.scanId, scanId));
    const list = issues ?? [];
    if (list.length === 0) return;

    const rows = list.map((issue, ordinal) => {
        const f = issueToFlatColumns(issue);
        return {
            id: uuidv4(),
            scanId,
            userId,
            ordinal,
            code: f.code,
            type: f.type,
            message: f.message,
            context: f.context,
            selector: f.selector,
            runner: f.runner,
            wcagLevel: f.wcagLevel,
            helpUrl: f.helpUrl,
            boundingBox: f.boundingBox,
        };
    });

    for (const c of chunkArray(rows, INSERT_CHUNK)) {
        await db.insert(scanIssues).values(c);
    }
}

function mapScanIssueRows(rows: (typeof scanIssues.$inferSelect)[]): Issue[] {
    return rows.map(scanIssueRowToIssue);
}

/** Load issues from `scan_issues` for a scan (empty if none). */
export async function listScanIssuesForScan(db: Db, userId: string, scanId: string): Promise<Issue[]> {
    const rows = await db
        .select()
        .from(scanIssues)
        .where(and(eq(scanIssues.scanId, scanId), eq(scanIssues.userId, userId)))
        .orderBy(asc(scanIssues.ordinal));
    return mapScanIssueRows(rows);
}

/**
 * Load issues by `scan_id` only. Call only after access is verified (e.g. `getScan(scanId, viewerId)` returned a result),
 * including borrowed standalone scans — rows are stored under the scan owner, not the viewer id.
 */
export async function listScanIssuesForScanId(db: Db, scanId: string): Promise<Issue[]> {
    const rows = await db
        .select()
        .from(scanIssues)
        .where(eq(scanIssues.scanId, scanId))
        .orderBy(asc(scanIssues.ordinal));
    return mapScanIssueRows(rows);
}

/**
 * Batch-load issues for many `scans.id` values (e.g. domain backfill). Preserves ordinal order per scan.
 * Empty map if `scanIds` is empty.
 */
export async function listScanIssuesForScanIds(db: Db, scanIds: string[]): Promise<Map<string, Issue[]>> {
    const out = new Map<string, Issue[]>();
    if (scanIds.length === 0) return out;
    const unique = [...new Set(scanIds)];

    for (const batch of chunkArray(unique, SCAN_ID_IN_BATCH)) {
        const rows = await db
            .select()
            .from(scanIssues)
            .where(inArray(scanIssues.scanId, batch))
            .orderBy(asc(scanIssues.scanId), asc(scanIssues.ordinal));

        for (const r of rows) {
            const list = out.get(r.scanId);
            const issue = scanIssueRowToIssue(r);
            if (list) list.push(issue);
            else out.set(r.scanId, [issue]);
        }
    }
    return out;
}
