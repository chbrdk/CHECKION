/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/journey-agent/[jobId]                     */
/*  Returns status and result of a UX Journey Agent run.              */
/*  Proxies to Python service when UX_JOURNEY_AGENT_URL is set.       */
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
        return NextResponse.json(
            { error: 'UX Journey Agent service is not configured.', status: 'unavailable' },
            { status: 501 }
        );
    }

    const statusUrl = agentBaseUrl.replace(/\/$/, '') + '/run/' + encodeURIComponent(jobId);
    try {
        const res = await fetch(statusUrl);
        const data = (await res.json()) as { result?: { videoUrl?: string }; status?: string; error?: string };
        if (!res.ok) {
            return NextResponse.json(
                { error: data?.error || `Agent service error: ${res.status}`, status: 'error' },
                { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
            );
        }
        // Rewrite agent's videoUrl to CHECKION proxy so the client can load the video with auth
        if (data?.result?.videoUrl && jobId) {
            data.result.videoUrl = `/api/scan/journey-agent/${encodeURIComponent(jobId)}/video`;
        }
        return NextResponse.json(data);
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to reach UX Journey Agent service.';
        return NextResponse.json(
            { error: message, status: 'error' },
            { status: 502 }
        );
    }
}
