/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/share (create share link, auth required)     */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
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
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    let body: { type?: string; id?: string; password?: string };
    try {
        body = await request.json();
    } catch {
        return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
    }
    const type = body.type as ShareResourceType | undefined;
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const password = typeof body.password === 'string' ? body.password : undefined;
    if (!id || (type !== 'single' && type !== 'domain' && type !== 'journey' && type !== 'geo_eeat')) {
        return apiError('Body must include type: "single" | "domain" | "journey" | "geo_eeat" and id: string', API_STATUS.BAD_REQUEST);
    }

    if (type === 'single') {
        const scan = await getScan(id, session.user.id);
        if (!scan) return apiError('Scan not found', API_STATUS.NOT_FOUND);
    } else if (type === 'domain') {
        const domain = await getDomainScan(id, session.user.id);
        if (!domain) return apiError('Domain scan not found', API_STATUS.NOT_FOUND);
    } else if (type === 'geo_eeat') {
        const run = await getGeoEeatRun(id, session.user.id);
        if (!run) return apiError('GEO/E-E-A-T run not found', API_STATUS.NOT_FOUND);
        if (run.status !== 'complete') {
            return apiError('Run must be complete to share', API_STATUS.BAD_REQUEST);
        }
    } else {
        const run = await getJourneyRun(id, session.user.id);
        if (!run) return apiError('Journey not found', API_STATUS.NOT_FOUND);
        if (run.status !== 'complete') {
            return apiError('Journey must be complete to share', API_STATUS.BAD_REQUEST);
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
