/**
 * Persist WCAG issues for a `scans` row in `scan_issues` (parallel to `result.issues` JSON).
 */
import { v4 as uuidv4 } from 'uuid';
import { and, asc, eq } from 'drizzle-orm';
import type { Issue } from '@/lib/types';
import { scanIssues } from '@/lib/db/schema';
import type { Db } from '@/lib/db';

function chunk<T>(arr: T[], size: number): T[][] {
    if (arr.length === 0) return [];
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

/** Replace all issue rows for a scan (idempotent). */
export async function replaceScanIssuesForScan(
    db: Db,
    userId: string,
    scanId: string,
    issues: Issue[] | undefined
): Promise<void> {
    await db.delete(scanIssues).where(eq(scanIssues.scanId, scanId));
    const list = issues ?? [];
    if (list.length === 0) return;

    const rows = list.map((issue, ordinal) => ({
        id: uuidv4(),
        scanId,
        userId,
        ordinal,
        code: issue.code,
        type: issue.type,
        message: issue.message,
        context: issue.context ?? '',
        selector: issue.selector ?? '',
        runner: issue.runner,
        wcagLevel: issue.wcagLevel,
        helpUrl: issue.helpUrl ?? null,
        boundingBox: issue.boundingBox ?? null,
    }));

    for (const c of chunk(rows, 500)) {
        await db.insert(scanIssues).values(c);
    }
}

function mapScanIssueRows(rows: (typeof scanIssues.$inferSelect)[]): Issue[] {
    return rows.map((r) => ({
        code: r.code,
        type: r.type as Issue['type'],
        message: r.message,
        context: r.context,
        selector: r.selector,
        runner: r.runner as Issue['runner'],
        wcagLevel: r.wcagLevel as Issue['wcagLevel'],
        helpUrl: r.helpUrl,
        boundingBox: r.boundingBox as Issue['boundingBox'],
    }));
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
