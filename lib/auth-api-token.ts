/* ------------------------------------------------------------------ */
/*  CHECKION – Bearer API token auth + getRequestUser                 */
/* ------------------------------------------------------------------ */

import { createHash } from 'crypto';
import { auth } from '@/auth';
import { getUserByTokenHash } from '@/lib/db/api-tokens';

function hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * If request has Authorization: Bearer <token>, resolve token to user id.
 * Token must be checkion_<64 hex>. Returns null if missing/invalid.
 */
export async function getUserFromBearerToken(request: Request): Promise<{ id: string } | null> {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    if (!token || !token.startsWith('checkion_') || token.length !== 9 + 64) return null;
    const tokenHash = hashToken(token);
    const userId = await getUserByTokenHash(tokenHash);
    return userId ? { id: userId } : null;
}

/**
 * Get the authenticated user for this request: Bearer token first, then session.
 * Use in API routes instead of auth() when you want to allow both cookie and API token.
 */
export async function getRequestUser(request: Request): Promise<{ id: string } | null> {
    const bearer = await getUserFromBearerToken(request);
    if (bearer) return bearer;
    const session = await auth();
    return session?.user?.id ? { id: session.user.id } : null;
}
