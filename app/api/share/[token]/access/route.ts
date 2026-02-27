/* ------------------------------------------------------------------ */
/*  POST /api/share/[token]/access (public)                            */
/*  Body: { password?: string }. Returns { accessToken } or 401.      */
/*  If share has no password, returns token. If password set, verifies.*/
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getShareByToken, verifySharePassword } from '@/lib/db/shares';
import { createShareAccessToken } from '@/lib/share-access';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;
    const share = await getShareByToken(token);
    if (!share) {
        return apiError('Share not found or expired', API_STATUS.NOT_FOUND);
    }

    if (!share.passwordHash) {
        const accessToken = createShareAccessToken(token);
        return NextResponse.json({ accessToken });
    }

    let body: { password?: string };
    try {
        body = await request.json();
    } catch {
        return apiError('Invalid JSON', API_STATUS.BAD_REQUEST, { requiresPassword: true });
    }
    const password = typeof body.password === 'string' ? body.password : '';
    const ok = await verifySharePassword(token, password);
    if (!ok) {
        return apiError('Invalid password', API_STATUS.UNAUTHORIZED, { requiresPassword: true });
    }
    const accessToken = createShareAccessToken(token);
    return NextResponse.json({ accessToken });
}
