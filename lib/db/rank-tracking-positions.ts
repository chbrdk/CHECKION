/* ------------------------------------------------------------------ */
/*  CHECKION – Rank tracking position history (DB)                     */
/* ------------------------------------------------------------------ */

import { eq, and, desc, inArray } from 'drizzle-orm';
import { getDb } from './index';
import { rankTrackingPositions, rankTrackingKeywords } from './schema';
import type { SerpOrganicResult } from '@/lib/serp-organic';

export interface RankTrackingPositionRow {
    id: string;
    keywordId: string;
    position: number | null;
    competitorPositions?: Record<string, number | null> | null;
    serpLeaderDomain?: string | null;
    serpLeaderUrl?: string | null;
    serpOrganic?: SerpOrganicResult[] | null;
    recordedAt: Date;
}

export async function insertPosition(
    keywordId: string,
    position: number | null,
    id: string,
    competitorPositions?: Record<string, number | null>,
    serpLeader?: { domain: string; url: string } | null,
    serpOrganic?: SerpOrganicResult[] | null
): Promise<void> {
    const db = getDb();
    await db.insert(rankTrackingPositions).values({
        id,
        keywordId,
        position,
        competitorPositions: competitorPositions ?? null,
        serpLeaderDomain: serpLeader?.domain ?? null,
        serpLeaderUrl: serpLeader?.url ?? null,
        serpOrganic: serpOrganic?.length ? serpOrganic : null,
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
            serpLeaderDomain: rankTrackingPositions.serpLeaderDomain,
            serpLeaderUrl: rankTrackingPositions.serpLeaderUrl,
            serpOrganic: rankTrackingPositions.serpOrganic,
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
        serpOrganic: (r.serpOrganic as SerpOrganicResult[] | null) ?? undefined,
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

/** Returns map of keywordId -> latest snapshot for each keyword. */
export async function getLastPositionsByKeywordIds(
    keywordIds: string[]
): Promise<
    Map<
        string,
        {
            position: number | null;
            recordedAt: Date;
            competitorPositions?: Record<string, number | null>;
            serpLeaderDomain?: string | null;
            serpLeaderUrl?: string | null;
            serpOrganic?: SerpOrganicResult[];
        }
    >
> {
    if (keywordIds.length === 0) return new Map();
    const db = getDb();
    const rows = await db
        .select({
            keywordId: rankTrackingPositions.keywordId,
            position: rankTrackingPositions.position,
            recordedAt: rankTrackingPositions.recordedAt,
            competitorPositions: rankTrackingPositions.competitorPositions,
            serpLeaderDomain: rankTrackingPositions.serpLeaderDomain,
            serpLeaderUrl: rankTrackingPositions.serpLeaderUrl,
            serpOrganic: rankTrackingPositions.serpOrganic,
        })
        .from(rankTrackingPositions)
        .where(inArray(rankTrackingPositions.keywordId, keywordIds))
        .orderBy(desc(rankTrackingPositions.recordedAt));
    const map = new Map<
        string,
        {
            position: number | null;
            recordedAt: Date;
            competitorPositions?: Record<string, number | null>;
            serpLeaderDomain?: string | null;
            serpLeaderUrl?: string | null;
            serpOrganic?: SerpOrganicResult[];
        }
    >();
    for (const row of rows) {
        if (!map.has(row.keywordId)) {
            const comp = row.competitorPositions as Record<string, number | null> | null | undefined;
            const organic = row.serpOrganic as SerpOrganicResult[] | null | undefined;
            map.set(row.keywordId, {
                position: row.position,
                recordedAt: row.recordedAt,
                ...(comp && typeof comp === 'object' && !Array.isArray(comp) && { competitorPositions: comp }),
                ...(row.serpLeaderDomain != null && { serpLeaderDomain: row.serpLeaderDomain }),
                ...(row.serpLeaderUrl != null && { serpLeaderUrl: row.serpLeaderUrl }),
                ...(Array.isArray(organic) && organic.length > 0 && { serpOrganic: organic }),
            });
        }
    }
    return map;
}

export async function getLastSerpOrganicForKeyword(
    keywordId: string,
    userId: string
): Promise<{ organic: SerpOrganicResult[]; recordedAt: Date; position: number | null } | null> {
    const db = getDb();
    const rows = await db
        .select({
            serpOrganic: rankTrackingPositions.serpOrganic,
            recordedAt: rankTrackingPositions.recordedAt,
            position: rankTrackingPositions.position,
        })
        .from(rankTrackingPositions)
        .innerJoin(rankTrackingKeywords, eq(rankTrackingPositions.keywordId, rankTrackingKeywords.id))
        .where(and(eq(rankTrackingPositions.keywordId, keywordId), eq(rankTrackingKeywords.userId, userId)))
        .orderBy(desc(rankTrackingPositions.recordedAt))
        .limit(1);
    if (rows.length === 0) return null;
    const organic = rows[0].serpOrganic as SerpOrganicResult[] | null;
    if (!Array.isArray(organic) || organic.length === 0) return null;
    return {
        organic,
        recordedAt: rows[0].recordedAt,
        position: rows[0].position,
    };
}
