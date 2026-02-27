/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/share (create share link, auth required)     */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getScan } from '@/lib/db/scans';
import { getDomainScan } from '@/lib/db/scans';
import { getJourneyRun } from '@/lib/db/journey-runs';
import { getGeoEeatRun } from '@/lib/db/geo-eeat-runs';
import { createShare, getShareByResource } from '@/lib/db/shares';
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
    let body: { type?: string; id?: string; password?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const type = body.type as ShareResourceType | undefined;
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const password = typeof body.password === 'string' ? body.password : undefined;
    if (!id || (type !== 'single' && type !== 'domain' && type !== 'journey' && type !== 'geo_eeat')) {
        return NextResponse.json(
            { error: 'Body must include type: "single" | "domain" | "journey" | "geo_eeat" and id: string' },
            { status: 400 }
        );
    }

    if (type === 'single') {
        const scan = await getScan(id, session.user.id);
        if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    } else if (type === 'domain') {
        const domain = await getDomainScan(id, session.user.id);
        if (!domain) return NextResponse.json({ error: 'Domain scan not found' }, { status: 404 });
    } else if (type === 'geo_eeat') {
        const run = await getGeoEeatRun(id, session.user.id);
        if (!run) return NextResponse.json({ error: 'GEO/E-E-A-T run not found' }, { status: 404 });
        if (run.status !== 'complete') {
            return NextResponse.json({ error: 'Run must be complete to share' }, { status: 400 });
        }
    } else {
        const run = await getJourneyRun(id, session.user.id);
        if (!run) return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
        if (run.status !== 'complete') {
            return NextResponse.json({ error: 'Journey must be complete to share' }, { status: 400 });
        }
    }

    const origin = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
    const protocol = request.headers.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = origin ? `${protocol}://${origin}` : '';
    const buildUrl = (t: string) => (baseUrl ? `${baseUrl}${SHARE_PATH}/${encodeURIComponent(t)}` : `${SHARE_PATH}/${t}`);

    const existing = await getShareByResource(session.user.id, type, id);
    if (existing) {
        return NextResponse.json({
            token: existing.token,
            url: buildUrl(existing.token),
            alreadyShared: true,
            hasPassword: existing.hasPassword,
        });
    }

    const token = generateToken();
    await createShare(token, session.user.id, type, id, { password });
    return NextResponse.json({
        token,
        url: buildUrl(token),
        alreadyShared: false,
        hasPassword: Boolean(password && password.trim()),
    });
}
