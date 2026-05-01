/* ------------------------------------------------------------------ */
/*  Align scans.tags (standalone rows only) with projects.tags        */
/* ------------------------------------------------------------------ */

import { sql, or, isNull } from 'drizzle-orm';
import { getDb } from './index';
import { domainScans, scans } from './schema';

export type SyncStandaloneScanTagsMode = 'fillEmpty' | 'replaceFromProject';

/** Predicate for standalone rows (alias `s`) in raw UPDATE SQL. */
const STANDALONE_SCAN_PREDICATE_SQL = sql.raw(
    '(s."group_id" IS NULL OR NOT EXISTS (SELECT 1 FROM "domain_scans" AS d WHERE d."id" = s."group_id"))'
);

/** Same notion as list standalone: not a domain crawl page row. */
export function standaloneScanRowsWhere() {
    return or(
        isNull(scans.groupId),
        sql`NOT EXISTS (SELECT 1 FROM ${domainScans} WHERE ${domainScans.id} = ${scans.groupId})`
    )!;
}

/**
 * `fillEmpty`: standalone scans with empty `tags` get project tags when project has tags.
 * `replaceFromProject`: every standalone scan with a project gets `tags` from that project.
 */
export async function syncStandaloneScansTagsFromProjects(mode: SyncStandaloneScanTagsMode): Promise<number> {
    const db = getDb();

    if (mode === 'replaceFromProject') {
        const res = await db.execute(sql`
            UPDATE "scans" AS s
            SET "tags" = p."tags"
            FROM "projects" AS p
            WHERE s."project_id" = p."id"
              AND s."project_id" IS NOT NULL
              AND ${STANDALONE_SCAN_PREDICATE_SQL}
            RETURNING s."id"
        `);
        return countExecuteRows(res);
    }

    const res = await db.execute(sql`
        UPDATE "scans" AS s
        SET "tags" = p."tags"
        FROM "projects" AS p
        WHERE s."project_id" = p."id"
          AND s."project_id" IS NOT NULL
          AND ${STANDALONE_SCAN_PREDICATE_SQL}
          AND coalesce(s."tags", '[]'::jsonb) = '[]'::jsonb
          AND coalesce(p."tags", '[]'::jsonb) <> '[]'::jsonb
        RETURNING s."id"
    `);
    return countExecuteRows(res);
}

/** After project tag updates: copy `projects.tags` onto all linked standalone scan rows for this project. */
export async function syncStandaloneScansTagsForProjectId(projectId: string): Promise<number> {
    const db = getDb();
    const res = await db.execute(sql`
        UPDATE "scans" AS s
        SET "tags" = p."tags"
        FROM "projects" AS p
        WHERE s."project_id" = p."id"
          AND p."id" = ${projectId}
          AND ${STANDALONE_SCAN_PREDICATE_SQL}
        RETURNING s."id"
    `);
    return countExecuteRows(res);
}

export async function listDistinctStandaloneScanUserIds(): Promise<string[]> {
    const db = getDb();
    const rows = await db
        .selectDistinct({ userId: scans.userId })
        .from(scans)
        .where(standaloneScanRowsWhere());
    return rows.map((r) => r.userId);
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
