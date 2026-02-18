/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/journey-agent/[jobId]/live/stream        */
/*  Proxies to agent's MJPEG stream (live viewport).                 */
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

    const streamUrl = agentBaseUrl.replace(/\/$/, '') + '/run/' + encodeURIComponent(jobId) + '/live/stream';
    try {
        const res = await fetch(streamUrl, { cache: 'no-store' });
        if (!res.ok || !res.body) {
            return new NextResponse(null, { status: res.status });
        }
        return new NextResponse(res.body, {
            headers: {
                'Content-Type': res.headers.get('Content-Type') || 'multipart/x-mixed-replace; boundary=frame',
                'Cache-Control': 'no-store',
            },
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to connect to live stream.';
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
