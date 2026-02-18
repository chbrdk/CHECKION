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
        const data = await res.json();
        if (!res.ok) {
            return NextResponse.json(
                { error: (data as { error?: string })?.error || `Agent service error: ${res.status}`, status: 'error' },
                { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
            );
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
