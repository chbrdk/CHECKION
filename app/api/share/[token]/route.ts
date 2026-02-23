/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/share/[token] (public, no auth)                */
/* Returns { type: 'single'|'domain'|'journey', data } for the share.  */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getCachedShareByToken, getCachedScan, getCachedDomainScan } from '@/lib/cache';
import { getJourneyRun } from '@/lib/db/journey-runs';
import { buildDomainSummary } from '@/lib/domain-summary';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;
    const share = await getCachedShareByToken(token);
    if (!share) {
        return NextResponse.json({ error: 'Share not found or expired' }, { status: 404 });
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

    const domain = await getCachedDomainScan(share.resourceId, share.userId);
    if (!domain) return NextResponse.json({ error: 'Domain scan not found' }, { status: 404 });
    const summary = buildDomainSummary(domain);
    return NextResponse.json({ type: 'domain' as const, data: summary });
}
