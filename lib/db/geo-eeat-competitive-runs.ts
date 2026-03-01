/* ------------------------------------------------------------------ */
/*  CHECKION – GEO E-E-A-T competitive benchmark run history (DB)     */
/* ------------------------------------------------------------------ */

import { eq, and, desc } from 'drizzle-orm';
import { getDb } from './index';
import { geoEeatCompetitiveRuns } from './schema';
import type { CompetitiveBenchmarkResult } from '@/lib/types';

export type CompetitiveRunStatus = 'running' | 'complete' | 'error';

export interface CompetitiveRunRow {
    id: string;
    geoEeatRunId: string;
    userId: string;
    startedAt: Date;
    completedAt: Date | null;
    status: CompetitiveRunStatus;
    competitiveByModel: Record<string, CompetitiveBenchmarkResult> | null;
    queries: string[];
    competitors: string[];
    error: string | null;
}

export async function insertCompetitiveRun(
    id: string,
    geoEeatRunId: string,
    userId: string,
    queries: string[],
    competitors: string[]
): Promise<void> {
    const db = getDb();
    await db.insert(geoEeatCompetitiveRuns).values({
        id,
        geoEeatRunId,
        userId,
        status: 'running',
        competitiveByModel: null,
        queries,
        competitors,
        error: null,
    });
}

export async function getCompetitiveRun(
    id: string,
    userId: string
): Promise<CompetitiveRunRow | null> {
    const db = getDb();
    const rows = await db
        .select()
        .from(geoEeatCompetitiveRuns)
        .where(and(eq(geoEeatCompetitiveRuns.id, id), eq(geoEeatCompetitiveRuns.userId, userId)))
        .limit(1);
    return rows.length > 0 ? (rows[0] as CompetitiveRunRow) : null;
}

export async function listCompetitiveRunsByGeoEeatJob(
    geoEeatRunId: string,
    userId: string,
    limit: number = 20
): Promise<CompetitiveRunRow[]> {
    const db = getDb();
    const rows = await db
        .select()
        .from(geoEeatCompetitiveRuns)
        .where(
            and(
                eq(geoEeatCompetitiveRuns.geoEeatRunId, geoEeatRunId),
                eq(geoEeatCompetitiveRuns.userId, userId)
            )
        )
        .orderBy(desc(geoEeatCompetitiveRuns.startedAt))
        .limit(limit);
    return rows as CompetitiveRunRow[];
}

export async function updateCompetitiveRun(
    id: string,
    userId: string,
    data: {
        status?: CompetitiveRunStatus;
        completedAt?: Date | null;
        competitiveByModel?: Record<string, CompetitiveBenchmarkResult> | null;
        error?: string | null;
    }
): Promise<void> {
    const db = getDb();
    const set: Record<string, unknown> = {};
    if (data.status !== undefined) set.status = data.status;
    if (data.completedAt !== undefined) set.completedAt = data.completedAt;
    if (data.competitiveByModel !== undefined) set.competitiveByModel = data.competitiveByModel;
    if (data.error !== undefined) set.error = data.error;
    if (Object.keys(set).length === 0) return;
    await db
        .update(geoEeatCompetitiveRuns)
        .set(set)
        .where(and(eq(geoEeatCompetitiveRuns.id, id), eq(geoEeatCompetitiveRuns.userId, userId)));
}
