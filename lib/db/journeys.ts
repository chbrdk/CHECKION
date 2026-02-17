/* ------------------------------------------------------------------ */
/*  CHECKION – Saved user journeys (history)                           */
/* ------------------------------------------------------------------ */

import { eq, and, desc } from 'drizzle-orm';
import { getDb } from './index';
import { savedJourneys, domainScans } from './schema';
import type { JourneyResult } from '@/lib/types';

export interface SavedJourneyRow {
    id: string;
    userId: string;
    domainScanId: string;
    domain?: string;
    name: string | null;
    goal: string;
    result: JourneyResult;
    createdAt: Date;
}

export async function addSavedJourney(
    id: string,
    userId: string,
    domainScanId: string,
    goal: string,
    result: JourneyResult,
    name?: string | null
): Promise<void> {
    const db = getDb();
    await db.insert(savedJourneys).values({
        id,
        userId,
        domainScanId,
        name: name ?? null,
        goal,
        result: result as unknown as Record<string, unknown>,
    });
}

export async function listSavedJourneys(
    userId: string,
    options?: { domainScanId?: string; limit?: number }
): Promise<SavedJourneyRow[]> {
    const db = getDb();
    const where = options?.domainScanId
        ? and(eq(savedJourneys.userId, userId), eq(savedJourneys.domainScanId, options.domainScanId))
        : eq(savedJourneys.userId, userId);
    const base = db
        .select({
            id: savedJourneys.id,
            userId: savedJourneys.userId,
            domainScanId: savedJourneys.domainScanId,
            domain: domainScans.domain,
            name: savedJourneys.name,
            goal: savedJourneys.goal,
            result: savedJourneys.result,
            createdAt: savedJourneys.createdAt,
        })
        .from(savedJourneys)
        .innerJoin(domainScans, eq(savedJourneys.domainScanId, domainScans.id))
        .where(where)
        .orderBy(desc(savedJourneys.createdAt));
    const rows = options?.limit != null ? await base.limit(options.limit) : await base;
    return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        domainScanId: r.domainScanId,
        domain: r.domain,
        name: r.name,
        goal: r.goal,
        result: r.result as unknown as JourneyResult,
        createdAt: r.createdAt,
    }));
}

export async function getSavedJourney(id: string, userId: string): Promise<SavedJourneyRow | null> {
    const db = getDb();
    const rows = await db
        .select()
        .from(savedJourneys)
        .where(and(eq(savedJourneys.id, id), eq(savedJourneys.userId, userId)))
        .limit(1);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
        id: r.id,
        userId: r.userId,
        domainScanId: r.domainScanId,
        name: r.name,
        goal: r.goal,
        result: r.result as unknown as JourneyResult,
        createdAt: r.createdAt,
    };
}

export async function deleteSavedJourney(id: string, userId: string): Promise<boolean> {
    const db = getDb();
    const deleted = await db
        .delete(savedJourneys)
        .where(and(eq(savedJourneys.id, id), eq(savedJourneys.userId, userId)));
    return (deleted.rowCount ?? 0) > 0;
}
