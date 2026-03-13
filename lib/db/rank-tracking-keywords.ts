/* ------------------------------------------------------------------ */
/*  CHECKION – Rank tracking keywords (DB)                             */
/* ------------------------------------------------------------------ */

import { eq, and, desc } from 'drizzle-orm';
import { getDb } from './index';
import { rankTrackingKeywords } from './schema';

export interface RankTrackingKeywordRow {
    id: string;
    userId: string;
    projectId: string | null;
    domain: string;
    keyword: string;
    country: string;
    language: string;
    device: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function insertKeyword(
    id: string,
    userId: string,
    projectId: string | null,
    data: { domain: string; keyword: string; country: string; language: string; device?: string | null }
): Promise<void> {
    const db = getDb();
    const now = new Date();
    await db.insert(rankTrackingKeywords).values({
        id,
        userId,
        projectId,
        domain: data.domain,
        keyword: data.keyword,
        country: data.country,
        language: data.language,
        device: data.device ?? null,
        createdAt: now,
        updatedAt: now,
    });
}

export async function getKeyword(id: string, userId: string): Promise<RankTrackingKeywordRow | null> {
    const db = getDb();
    const rows = await db
        .select()
        .from(rankTrackingKeywords)
        .where(and(eq(rankTrackingKeywords.id, id), eq(rankTrackingKeywords.userId, userId)))
        .limit(1);
    return rows.length > 0 ? (rows[0] as RankTrackingKeywordRow) : null;
}

export async function listKeywordsByProject(userId: string, projectId: string): Promise<RankTrackingKeywordRow[]> {
    const db = getDb();
    const rows = await db
        .select()
        .from(rankTrackingKeywords)
        .where(and(eq(rankTrackingKeywords.userId, userId), eq(rankTrackingKeywords.projectId, projectId)))
        .orderBy(desc(rankTrackingKeywords.updatedAt));
    return rows as RankTrackingKeywordRow[];
}

export async function deleteKeyword(id: string, userId: string): Promise<boolean> {
    const db = getDb();
    const deleted = await db
        .delete(rankTrackingKeywords)
        .where(and(eq(rankTrackingKeywords.id, id), eq(rankTrackingKeywords.userId, userId)));
    return (deleted.rowCount ?? 0) > 0;
}

export async function getKeywordsCountByProject(projectId: string): Promise<number> {
    const db = getDb();
    const rows = await db
        .select({ id: rankTrackingKeywords.id })
        .from(rankTrackingKeywords)
        .where(eq(rankTrackingKeywords.projectId, projectId));
    return rows.length;
}

export async function listKeywordIdsByProject(projectId: string): Promise<string[]> {
    const db = getDb();
    const rows = await db
        .select({ id: rankTrackingKeywords.id })
        .from(rankTrackingKeywords)
        .where(eq(rankTrackingKeywords.projectId, projectId));
    return rows.map((r) => r.id);
}

export async function touchKeywordUpdatedAt(id: string, userId: string): Promise<void> {
    const db = getDb();
    await db
        .update(rankTrackingKeywords)
        .set({ updatedAt: new Date() })
        .where(and(eq(rankTrackingKeywords.id, id), eq(rankTrackingKeywords.userId, userId)));
}
