/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/share/[token]/video (public, no auth)         */
/*  Streams journey recording for a valid journey share token.        */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getCachedShareByToken } from '@/lib/cache';
import { getJourneyRun } from '@/lib/db/journey-runs';
import { ENV_UX_JOURNEY_AGENT_URL } from '@/lib/constants';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;
    const share = await getCachedShareByToken(token);
    if (!share || share.resourceType !== 'journey') {
        return NextResponse.json({ error: 'Share not found or not a journey share' }, { status: 404 });
    }

    const run = await getJourneyRun(share.resourceId, share.userId);
    if (!run || run.status !== 'complete') {
        return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    const agentBaseUrl = process.env[ENV_UX_JOURNEY_AGENT_URL];
    if (!agentBaseUrl) {
        return NextResponse.json({ error: 'Journey video not available' }, { status: 503 });
    }

    const jobId = share.resourceId;
    const videoUrl = agentBaseUrl.replace(/\/$/, '') + '/run/' + encodeURIComponent(jobId) + '/video';
    try {
        const res = await fetch(videoUrl);
        if (!res.ok) {
            return NextResponse.json({ error: 'Video not found' }, { status: res.status });
        }
        const blob = await res.blob();
        return new NextResponse(blob, {
            headers: {
                'Content-Type': res.headers.get('Content-Type') || 'video/webm',
                'Content-Disposition': res.headers.get('Content-Disposition') || `inline; filename="journey-${jobId}.webm"`,
            },
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to fetch video.';
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
