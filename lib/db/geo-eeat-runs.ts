/* ------------------------------------------------------------------ */
/*  CHECKION – GEO / E-E-A-T intensive run history (DB)               */
/* ------------------------------------------------------------------ */

import { eq, and, desc, isNull } from 'drizzle-orm';
import { getDb } from './index';
import { geoEeatRuns } from './schema';
import type { GeoEeatIntensiveResult } from '@/lib/types';

export type GeoEeatRunStatus = 'queued' | 'running' | 'complete' | 'error';

export interface GeoEeatRunRow {
    id: string;
    userId: string;
    projectId: string | null;
    url: string;
    domainScanId: string | null;
    status: GeoEeatRunStatus;
    payload: GeoEeatIntensiveResult | null;
    error: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function insertGeoEeatRun(
    id: string,
    userId: string,
    url: string,
    options: { domainScanId?: string | null; projectId?: string | null } = {}
): Promise<void> {
    const db = getDb();
    await db.insert(geoEeatRuns).values({
        id,
        userId,
        projectId: options.projectId ?? null,
        url,
        domainScanId: options.domainScanId ?? null,
        status: 'queued',
        payload: null,
        error: null,
    });
}

export async function updateGeoEeatRunProject(id: string, userId: string, projectId: string | null): Promise<boolean> {
    const db = getDb();
    const updated = await db.update(geoEeatRuns).set({ projectId }).where(and(eq(geoEeatRuns.id, id), eq(geoEeatRuns.userId, userId)));
    return (updated.rowCount ?? 0) > 0;
}

export async function getGeoEeatRun(id: string, userId: string): Promise<GeoEeatRunRow | null> {
    const db = getDb();
    const rows = await db
        .select()
        .from(geoEeatRuns)
        .where(and(eq(geoEeatRuns.id, id), eq(geoEeatRuns.userId, userId)))
        .limit(1);
    return rows.length > 0 ? (rows[0] as GeoEeatRunRow) : null;
}

export async function updateGeoEeatRun(
    id: string,
    userId: string,
    data: {
        status: GeoEeatRunStatus;
        payload?: GeoEeatIntensiveResult | null;
        error?: string | null;
    }
): Promise<void> {
    const db = getDb();
    await db
        .update(geoEeatRuns)
        .set({
            status: data.status,
            payload: data.payload !== undefined ? data.payload : undefined,
            error: data.error !== undefined ? data.error : undefined,
            updatedAt: new Date(),
        })
        .where(and(eq(geoEeatRuns.id, id), eq(geoEeatRuns.userId, userId)));
}

export async function listGeoEeatRuns(
    userId: string,
    limit: number = 50,
    options?: { projectId?: string | null }
): Promise<GeoEeatRunRow[]> {
    const db = getDb();
    const whereCond = options?.projectId === undefined
        ? eq(geoEeatRuns.userId, userId)
        : options.projectId === null
            ? and(eq(geoEeatRuns.userId, userId), isNull(geoEeatRuns.projectId))
            : and(eq(geoEeatRuns.userId, userId), eq(geoEeatRuns.projectId, options.projectId));
    const rows = await db
        .select()
        .from(geoEeatRuns)
        .where(whereCond)
        .orderBy(desc(geoEeatRuns.createdAt))
        .limit(limit);
    return rows as GeoEeatRunRow[];
}
