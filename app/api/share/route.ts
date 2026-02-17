/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/share (create share link, auth required)     */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getScan } from '@/lib/db/scans';
import { getDomainScan } from '@/lib/db/scans';
import { createShare } from '@/lib/db/shares';
import type { ShareResourceType } from '@/lib/db/shares';
import { SHARE_PATH } from '@/lib/constants';
import { randomBytes } from 'crypto';

function generateToken(): string {
    return randomBytes(24).toString('base64url');
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let body: { type?: string; id?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const type = body.type as ShareResourceType | undefined;
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id || (type !== 'single' && type !== 'domain')) {
        return NextResponse.json(
            { error: 'Body must include type: "single" | "domain" and id: string' },
            { status: 400 }
        );
    }

    if (type === 'single') {
        const scan = await getScan(id, session.user.id);
        if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    } else {
        const domain = await getDomainScan(id, session.user.id);
        if (!domain) return NextResponse.json({ error: 'Domain scan not found' }, { status: 404 });
    }

    const token = generateToken();
    await createShare(token, session.user.id, type, id);

    const origin = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
    const protocol = request.headers.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = origin ? `${protocol}://${origin}` : '';
    const shareUrl = baseUrl ? `${baseUrl}${SHARE_PATH}/${token}` : `${SHARE_PATH}/${token}`;

    return NextResponse.json({ token, url: shareUrl });
}
