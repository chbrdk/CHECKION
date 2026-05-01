/* ------------------------------------------------------------------ */
/*  One-shot: align domain_scans.tags with projects.tags (admin only) */
/* ------------------------------------------------------------------ */

import { sql } from 'drizzle-orm';
import { getDb } from './index';
import { domainScans } from './schema';

export type SyncDomainScanTagsMode = 'fillEmpty' | 'replaceFromProject';

/**
 * `fillEmpty`: only rows where scan `tags` is `[]` and project has at least one tag.
 * `replaceFromProject`: every scan with a project gets `tags` copied from that project (overwrites scan-level tags).
 */
export async function syncDomainScanTagsFromProjects(mode: SyncDomainScanTagsMode): Promise<number> {
    const db = getDb();

    if (mode === 'replaceFromProject') {
        const res = await db.execute(sql`
            UPDATE "domain_scans" AS ds
            SET "tags" = p."tags"
            FROM "projects" AS p
            WHERE ds."project_id" = p."id"
              AND ds."project_id" IS NOT NULL
            RETURNING ds."id"
        `);
        return countExecuteRows(res);
    }

    const res = await db.execute(sql`
        UPDATE "domain_scans" AS ds
        SET "tags" = p."tags"
        FROM "projects" AS p
        WHERE ds."project_id" = p."id"
          AND ds."project_id" IS NOT NULL
          AND coalesce(ds."tags", '[]'::jsonb) = '[]'::jsonb
          AND coalesce(p."tags", '[]'::jsonb) <> '[]'::jsonb
        RETURNING ds."id"
    `);
    return countExecuteRows(res);
}

function countExecuteRows(res: unknown): number {
    if (res && typeof res === 'object' && 'rowCount' in res && typeof (res as { rowCount: unknown }).rowCount === 'number') {
        return (res as { rowCount: number }).rowCount;
    }
    if (Array.isArray(res)) return res.length;
    if (res && typeof res === 'object' && 'rows' in res && Array.isArray((res as { rows: unknown }).rows)) {
        return (res as { rows: unknown[] }).rows.length;
    }
    return 0;
}

/** Copy `projects.tags` onto all `domain_scans` rows for this project only (after auto-tag update). */
export async function syncDomainScanTagsForProjectId(projectId: string): Promise<number> {
    const db = getDb();
    const res = await db.execute(sql`
        UPDATE "domain_scans" AS ds
        SET "tags" = p."tags"
        FROM "projects" AS p
        WHERE ds."project_id" = p."id"
          AND p."id" = ${projectId}
        RETURNING ds."id"
    `);
    return countExecuteRows(res);
}

export async function listDistinctDomainScanUserIds(): Promise<string[]> {
    const db = getDb();
    const rows = await db.selectDistinct({ userId: domainScans.userId }).from(domainScans);
    return rows.map((r) => r.userId);
}
