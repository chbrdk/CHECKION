/* ------------------------------------------------------------------ */
/*  POST /api/share/[token]/access (public)                            */
/*  Body: { password?: string }. Returns { accessToken } or 401.      */
/*  If share has no password, returns token. If password set, verifies.*/
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getShareByToken, verifySharePassword } from '@/lib/db/shares';
import { createShareAccessToken } from '@/lib/share-access';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;
    const share = await getShareByToken(token);
    if (!share) {
        return NextResponse.json({ error: 'Share not found or expired' }, { status: 404 });
    }

    if (!share.passwordHash) {
        const accessToken = createShareAccessToken(token);
        return NextResponse.json({ accessToken });
    }

    let body: { password?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON', requiresPassword: true }, { status: 400 });
    }
    const password = typeof body.password === 'string' ? body.password : '';
    const ok = await verifySharePassword(token, password);
    if (!ok) {
        return NextResponse.json({ error: 'Invalid password', requiresPassword: true }, { status: 401 });
    }
    const accessToken = createShareAccessToken(token);
    return NextResponse.json({ accessToken });
}
