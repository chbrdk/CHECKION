/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/journey-agent/[jobId]/live               */
/*  Proxies to agent's /run/[jobId]/live (live viewport frame).       */
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

    const liveUrl = agentBaseUrl.replace(/\/$/, '') + '/run/' + encodeURIComponent(jobId) + '/live';
    try {
        const res = await fetch(liveUrl);
        if (!res.ok) {
            return new NextResponse(null, { status: res.status });
        }
        const blob = await res.blob();
        return new NextResponse(blob, {
            headers: {
                'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
                'Cache-Control': 'no-store',
            },
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to fetch live frame.';
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
