/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/journey-agent/[jobId]/video              */
/*  Proxies to agent's /run/[jobId]/video (recorded journey video).   */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ENV_UX_JOURNEY_AGENT_URL } from '@/lib/constants';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await params;
    if (!jobId) {
        return NextResponse.json({ error: 'jobId required.' }, { status: 400 });
    }

    const agentBaseUrl = process.env[ENV_UX_JOURNEY_AGENT_URL];
    if (!agentBaseUrl) {
        return NextResponse.json({ error: 'UX Journey Agent not configured.' }, { status: 501 });
    }

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
