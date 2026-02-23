/* ------------------------------------------------------------------ */
/*  CHECKION – Share links (public landing page)                       */
/* ------------------------------------------------------------------ */

import { eq, and } from 'drizzle-orm';
import { getDb } from './index';
import { shareLinks } from './schema';

export type ShareResourceType = 'single' | 'domain' | 'journey';

export interface ShareLinkRow {
    token: string;
    userId: string;
    resourceType: ShareResourceType;
    resourceId: string;
    createdAt: Date;
    expiresAt: Date | null;
}

export async function createShare(
    token: string,
    userId: string,
    resourceType: ShareResourceType,
    resourceId: string,
    options?: { expiresInDays?: number }
): Promise<void> {
    const db = getDb();
    let expiresAt: Date | null = null;
    if (options?.expiresInDays != null && options.expiresInDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + options.expiresInDays);
        expiresAt = d;
    }
    await db.insert(shareLinks).values({
        token,
        userId,
        resourceType,
        resourceId,
        expiresAt,
    });
}

export async function getShareByToken(token: string): Promise<ShareLinkRow | null> {
    const db = getDb();
    const rows = await db.select().from(shareLinks).where(eq(shareLinks.token, token)).limit(1);
    if (rows.length === 0) return null;
    const row = rows[0];
    if (row.expiresAt && new Date(row.expiresAt) < new Date()) return null;
    return {
        token: row.token,
        userId: row.userId,
        resourceType: row.resourceType as ShareResourceType,
        resourceId: row.resourceId,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
    };
}

export async function deleteShare(token: string, userId: string): Promise<boolean> {
    const db = getDb();
    const deleted = await db
        .delete(shareLinks)
        .where(and(eq(shareLinks.token, token), eq(shareLinks.userId, userId)));
    return (deleted.rowCount ?? 0) > 0;
}
