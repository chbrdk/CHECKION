/* ------------------------------------------------------------------ */
/*  CHECKION – UX Journey Agent run history (DB)                      */
/* ------------------------------------------------------------------ */

import { eq, and, desc } from 'drizzle-orm';
import { getDb } from './index';
import { journeyRuns } from './schema';

export type JourneyRunStatus = 'running' | 'complete' | 'error';

export interface JourneyRunRow {
    id: string;
    userId: string;
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
    task: string
): Promise<void> {
    const db = getDb();
    await db.insert(journeyRuns).values({
        id,
        userId,
        url,
        task,
        status: 'running',
        result: null,
        error: null,
    });
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
    limit: number = 50
): Promise<JourneyRunRow[]> {
    const db = getDb();
    const rows = await db
        .select()
        .from(journeyRuns)
        .where(eq(journeyRuns.userId, userId))
        .orderBy(desc(journeyRuns.createdAt))
        .limit(limit);
    return rows as JourneyRunRow[];
}
