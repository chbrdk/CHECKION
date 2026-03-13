/* ------------------------------------------------------------------ */
/*  CHECKION – Rank tracking position history (DB)                     */
/* ------------------------------------------------------------------ */

import { eq, and, desc, inArray } from 'drizzle-orm';
import { getDb } from './index';
import { rankTrackingPositions, rankTrackingKeywords } from './schema';

export interface RankTrackingPositionRow {
    id: string;
    keywordId: string;
    position: number | null;
    competitorPositions?: Record<string, number | null> | null;
    recordedAt: Date;
}

export async function insertPosition(
    keywordId: string,
    position: number | null,
    id: string,
    competitorPositions?: Record<string, number | null>
): Promise<void> {
    const db = getDb();
    await db.insert(rankTrackingPositions).values({
        id,
        keywordId,
        position,
        competitorPositions: competitorPositions ?? null,
        recordedAt: new Date(),
    });
}

export async function listPositionsByKeyword(
    keywordId: string,
    userId: string,
    limit: number = 90
): Promise<RankTrackingPositionRow[]> {
    const db = getDb();
    const rows = await db
        .select({
            id: rankTrackingPositions.id,
            keywordId: rankTrackingPositions.keywordId,
            position: rankTrackingPositions.position,
            competitorPositions: rankTrackingPositions.competitorPositions,
            recordedAt: rankTrackingPositions.recordedAt,
        })
        .from(rankTrackingPositions)
        .innerJoin(rankTrackingKeywords, eq(rankTrackingPositions.keywordId, rankTrackingKeywords.id))
        .where(and(eq(rankTrackingPositions.keywordId, keywordId), eq(rankTrackingKeywords.userId, userId)))
        .orderBy(desc(rankTrackingPositions.recordedAt))
        .limit(limit);
    return rows.map((r) => ({
        ...r,
        competitorPositions: (r.competitorPositions as Record<string, number | null> | null) ?? undefined,
    })) as RankTrackingPositionRow[];
}

export async function getLastPosition(keywordId: string): Promise<{ position: number | null; recordedAt: Date } | null> {
    const db = getDb();
    const rows = await db
        .select({ position: rankTrackingPositions.position, recordedAt: rankTrackingPositions.recordedAt })
        .from(rankTrackingPositions)
        .where(eq(rankTrackingPositions.keywordId, keywordId))
        .orderBy(desc(rankTrackingPositions.recordedAt))
        .limit(1);
    return rows.length > 0 ? { position: rows[0].position, recordedAt: rows[0].recordedAt } : null;
}

/** Returns map of keywordId -> { position, recordedAt, competitorPositions? } for the latest position of each keyword. */
export async function getLastPositionsByKeywordIds(
    keywordIds: string[]
): Promise<Map<string, { position: number | null; recordedAt: Date; competitorPositions?: Record<string, number | null> }>> {
    if (keywordIds.length === 0) return new Map();
    const db = getDb();
    const rows = await db
        .select({
            keywordId: rankTrackingPositions.keywordId,
            position: rankTrackingPositions.position,
            recordedAt: rankTrackingPositions.recordedAt,
            competitorPositions: rankTrackingPositions.competitorPositions,
        })
        .from(rankTrackingPositions)
        .where(inArray(rankTrackingPositions.keywordId, keywordIds))
        .orderBy(desc(rankTrackingPositions.recordedAt));
    const map = new Map<string, { position: number | null; recordedAt: Date; competitorPositions?: Record<string, number | null> }>();
    for (const row of rows) {
        if (!map.has(row.keywordId)) {
            const comp = row.competitorPositions as Record<string, number | null> | null | undefined;
            map.set(row.keywordId, {
                position: row.position,
                recordedAt: row.recordedAt,
                ...(comp && typeof comp === 'object' && !Array.isArray(comp) && { competitorPositions: comp }),
            });
        }
    }
    return map;
}
