/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/share/[token] (public, optional Bearer token)  */
/* Returns { type, data } or 403 { requiresPassword: true }.          */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCachedShareByToken, getCachedScan, getCachedDomainScan } from '@/lib/cache';
import { getJourneyRun } from '@/lib/db/journey-runs';
import { getGeoEeatRun } from '@/lib/db/geo-eeat-runs';
import { buildDomainSummary } from '@/lib/domain-summary';
import { verifyShareAccessToken } from '@/lib/share-access';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;
    const share = await getCachedShareByToken(token);
    if (!share) {
        return NextResponse.json({ error: 'Share not found or expired' }, { status: 404 });
    }

    if (share.passwordHash) {
        const authHeader = request.headers.get('authorization');
        const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
        const verified = bearer ? verifyShareAccessToken(bearer) : null;
        if (!verified || verified.shareToken !== token) {
            return NextResponse.json(
                { error: 'Password required', requiresPassword: true },
                { status: 403 }
            );
        }
    }

    if (share.resourceType === 'single') {
        const scan = await getCachedScan(share.resourceId, share.userId);
        if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
        return NextResponse.json({ type: 'single' as const, data: scan });
    }

    if (share.resourceType === 'journey') {
        const run = await getJourneyRun(share.resourceId, share.userId);
        if (!run || run.status !== 'complete') return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
        const result = (run.result ?? {}) as Record<string, unknown>;
        const videoPath = `/api/share/${encodeURIComponent(token)}/video`;
        return NextResponse.json({
            type: 'journey' as const,
            data: {
                ...result,
                videoUrl: videoPath,
                jobId: share.resourceId,
            },
        });
    }

    if (share.resourceType === 'geo_eeat') {
        const run = await getGeoEeatRun(share.resourceId, share.userId);
        if (!run || run.status !== 'complete') return NextResponse.json({ error: 'GEO/E-E-A-T run not found' }, { status: 404 });
        return NextResponse.json({
            type: 'geo_eeat' as const,
            data: {
                jobId: run.id,
                url: run.url,
                payload: run.payload,
            },
        });
    }

    const domain = await getCachedDomainScan(share.resourceId, share.userId);
    if (!domain) return NextResponse.json({ error: 'Domain scan not found' }, { status: 404 });
    const summary = buildDomainSummary(domain);
    return NextResponse.json({ type: 'domain' as const, data: summary });
}

/** DELETE /api/share/[token] – revoke share (auth required, must own share). */
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { token } = await params;
    const { deleteShare } = await import('@/lib/db/shares');
    const { invalidateShare } = await import('@/lib/cache');
    const deleted = await deleteShare(token, session.user.id);
    if (!deleted) {
        return NextResponse.json({ error: 'Share not found or access denied' }, { status: 404 });
    }
    invalidateShare(token);
    return NextResponse.json({ ok: true });
}

/** PATCH /api/share/[token] – set or remove password (auth required). Body: { password?: string | null }. */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { token } = await params;
    const { getShareByToken, updateSharePassword } = await import('@/lib/db/shares');
    const { invalidateShare } = await import('@/lib/cache');
    const share = await getShareByToken(token);
    if (!share || share.userId !== session.user.id) {
        return NextResponse.json({ error: 'Share not found or access denied' }, { status: 404 });
    }
    let body: { password?: string | null };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const password = body.password !== undefined ? (body.password === null || body.password === '' ? null : String(body.password)) : undefined;
    if (password === undefined) {
        return NextResponse.json({ error: 'Body must include password (string or null)' }, { status: 400 });
    }
    await updateSharePassword(token, session.user.id, password);
    invalidateShare(token);
    return NextResponse.json({ ok: true, hasPassword: password !== null });
}
