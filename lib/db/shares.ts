/* ------------------------------------------------------------------ */
/*  CHECKION – Share links (public landing page, optional password)   */
/* ------------------------------------------------------------------ */

import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getDb } from './index';
import { shareLinks } from './schema';

export type ShareResourceType = 'single' | 'domain' | 'journey' | 'geo_eeat';

export interface ShareLinkRow {
    token: string;
    userId: string;
    resourceType: ShareResourceType;
    resourceId: string;
    passwordHash: string | null;
    createdAt: Date;
    expiresAt: Date | null;
}

/** Public info about an existing share (no password hash). API adds full URL from request origin. */
export interface ShareInfo {
    token: string;
    hasPassword: boolean;
    createdAt: Date;
}

const BCRYPT_ROUNDS = 10;

export async function createShare(
    token: string,
    userId: string,
    resourceType: ShareResourceType,
    resourceId: string,
    options?: { expiresInDays?: number; password?: string }
): Promise<void> {
    const db = getDb();
    let expiresAt: Date | null = null;
    if (options?.expiresInDays != null && options.expiresInDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + options.expiresInDays);
        expiresAt = d;
    }
    let passwordHash: string | null = null;
    if (options?.password != null && options.password.trim() !== '') {
        passwordHash = await bcrypt.hash(options.password.trim(), BCRYPT_ROUNDS);
    }
    await db.insert(shareLinks).values({
        token,
        userId,
        resourceType,
        resourceId,
        passwordHash,
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
        passwordHash: row.passwordHash ?? null,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
    };
}

/** Get existing share for a resource (for "already shared" UI). */
export async function getShareByResource(
    userId: string,
    resourceType: ShareResourceType,
    resourceId: string
): Promise<ShareInfo | null> {
    const db = getDb();
    const rows = await db
        .select()
        .from(shareLinks)
        .where(
            and(
                eq(shareLinks.userId, userId),
                eq(shareLinks.resourceType, resourceType),
                eq(shareLinks.resourceId, resourceId)
            )
        )
        .limit(1);
    if (rows.length === 0) return null;
    const row = rows[0];
    if (row.expiresAt && new Date(row.expiresAt) < new Date()) return null;
    return {
        token: row.token,
        hasPassword: Boolean(row.passwordHash),
        createdAt: row.createdAt,
    };
}

export async function updateSharePassword(
    token: string,
    userId: string,
    password: string | null
): Promise<boolean> {
    const db = getDb();
    const passwordHash =
        password != null && password.trim() !== ''
            ? await bcrypt.hash(password.trim(), BCRYPT_ROUNDS)
            : null;
    const result = await db
        .update(shareLinks)
        .set({ passwordHash })
        .where(and(eq(shareLinks.token, token), eq(shareLinks.userId, userId)));
    return (result.rowCount ?? 0) > 0;
}

export async function verifySharePassword(token: string, password: string): Promise<boolean> {
    const share = await getShareByToken(token);
    if (!share || !share.passwordHash) return false;
    return bcrypt.compare(password.trim(), share.passwordHash);
}

export async function deleteShare(token: string, userId: string): Promise<boolean> {
    const db = getDb();
    const deleted = await db
        .delete(shareLinks)
        .where(and(eq(shareLinks.token, token), eq(shareLinks.userId, userId)));
    return (deleted.rowCount ?? 0) > 0;
}
