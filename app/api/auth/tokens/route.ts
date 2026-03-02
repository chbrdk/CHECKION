/* ------------------------------------------------------------------ */
/*  CHECKION – GET/POST /api/auth/tokens (API token management)        */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { listApiTokens, createApiToken } from '@/lib/db/api-tokens';

/** GET – list tokens for current user (id, name, createdAt; no secret). */
export async function GET(request: Request) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const tokens = await listApiTokens(user.id);
    return NextResponse.json({
        data: tokens.map((t) => ({
            id: t.id,
            name: t.name ?? undefined,
            createdAt: t.createdAt.toISOString(),
        })),
    });
}

/** POST – create token. Body: { name?: string }. Returns token once. */
export async function POST(request: Request) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    let body: { name?: string };
    try {
        body = await request.json().catch(() => ({}));
    } catch {
        body = {};
    }
    const name = typeof body?.name === 'string' ? body.name.trim() || undefined : undefined;
    const created = await createApiToken(user.id, name ?? null);
    return NextResponse.json({
        token: created.token,
        id: created.id,
        name: created.name ?? undefined,
        createdAt: created.createdAt.toISOString(),
    });
}
