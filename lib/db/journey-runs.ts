/* ------------------------------------------------------------------ */
/*  CHECKION – UX Journey Agent run history (DB)                      */
/* ------------------------------------------------------------------ */

import { eq, and, desc, inArray, isNull } from 'drizzle-orm';
import { getDb } from './index';
import { journeyRuns } from './schema';
import { getProject } from './projects';

export type JourneyRunStatus = 'running' | 'complete' | 'error';

export interface JourneyRunRow {
    id: string;
    userId: string;
    projectId: string | null;
    url: string;
    task: string;
    status: JourneyRunStatus;
    result: Record<string, unknown> | null;
    error: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function insertJourneyRun(
    id: string,
    userId: string,
    url: string,
    task: string,
    options?: { projectId?: string | null }
): Promise<void> {
    const db = getDb();
    await db.insert(journeyRuns).values({
        id,
        userId,
        projectId: options?.projectId ?? null,
        url,
        task,
        status: 'running',
        result: null,
        error: null,
    });
}

export async function updateJourneyRunProject(id: string, userId: string, projectId: string | null): Promise<boolean> {
    const db = getDb();
    const updated = await db.update(journeyRuns).set({ projectId }).where(and(eq(journeyRuns.id, id), eq(journeyRuns.userId, userId)));
    return (updated.rowCount ?? 0) > 0;
}

export async function getJourneyRun(id: string, userId: string): Promise<JourneyRunRow | null> {
    const db = getDb();
    const rows = await db
        .select()
        .from(journeyRuns)
        .where(and(eq(journeyRuns.id, id), eq(journeyRuns.userId, userId)))
        .limit(1);
    return rows.length > 0 ? (rows[0] as JourneyRunRow) : null;
}

export async function getJourneyRunById(id: string): Promise<JourneyRunRow | null> {
    const db = getDb();
    const rows = await db
        .select()
        .from(journeyRuns)
        .where(eq(journeyRuns.id, id))
        .limit(1);
    return rows.length > 0 ? (rows[0] as JourneyRunRow) : null;
}

export type JourneyRunProjectAssignmentContext = {
    resourceUserId: string;
    currentProjectId: string | null;
};

export async function resolveJourneyRunProjectAssignmentContext(
    id: string,
    viewerUserId: string
): Promise<JourneyRunProjectAssignmentContext | null> {
    const own = await getJourneyRun(id, viewerUserId);
    if (own) {
        return {
            resourceUserId: own.userId,
            currentProjectId: own.projectId ?? null,
        };
    }

    const db = getDb();
    const rows = await db
        .select()
        .from(journeyRuns)
        .where(eq(journeyRuns.id, id))
        .limit(1);
    if (rows.length === 0) return null;
    const row = rows[0] as JourneyRunRow;
    if (!row.projectId) return null;
    const project = await getProject(row.projectId, viewerUserId);
    if (!project) return null;
    return {
        resourceUserId: row.userId,
        currentProjectId: row.projectId,
    };
}

export async function upsertJourneyRunResult(
    id: string,
    userId: string,
    data: { status: JourneyRunStatus; result?: Record<string, unknown>; error?: string }
): Promise<void> {
    const db = getDb();
    const updated = await db
        .update(journeyRuns)
        .set({
            status: data.status,
            result: data.result ?? null,
            error: data.error ?? null,
            updatedAt: new Date(),
        })
        .where(and(eq(journeyRuns.id, id), eq(journeyRuns.userId, userId)));
    if ((updated.rowCount ?? 0) === 0 && (data.status === 'complete' || data.status === 'error')) {
        const result = data.result as { taskDescription?: string; siteDomain?: string } | undefined;
        const task = result?.taskDescription ?? '';
        const url = result?.siteDomain ? `https://${result.siteDomain}` : '';
        await db.insert(journeyRuns).values({
            id,
            userId,
            projectId: null,
            url,
            task,
            status: data.status,
            result: data.result ?? null,
            error: data.error ?? null,
        });
    }
}

export async function listJourneyRuns(
    userId: string,
    limit: number = 50,
    options?: { projectId?: string | null }
): Promise<JourneyRunRow[]> {
    const db = getDb();
    const whereCond = options?.projectId === undefined
        ? eq(journeyRuns.userId, userId)
        : options.projectId === null
            ? and(eq(journeyRuns.userId, userId), isNull(journeyRuns.projectId))
            : and(eq(journeyRuns.userId, userId), eq(journeyRuns.projectId, options.projectId));
    const rows = await db
        .select()
        .from(journeyRuns)
        .where(whereCond)
        .orderBy(desc(journeyRuns.createdAt))
        .limit(limit);
    return rows as JourneyRunRow[];
}

export async function listSharedProjectJourneyRuns(
    projectIds: string[],
    limit: number = 50
): Promise<JourneyRunRow[]> {
    if (projectIds.length === 0) return [];
    const db = getDb();
    const rows = await db
        .select()
        .from(journeyRuns)
        .where(inArray(journeyRuns.projectId, projectIds))
        .orderBy(desc(journeyRuns.createdAt))
        .limit(limit);
    return rows as JourneyRunRow[];
}
