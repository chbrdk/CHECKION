/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan/journey-agent (UX Journey Agent)        */
/*  Starts a browser-agent run (URL + natural language task).        */
/*  Delegates to Python service (Browser Use + Claude) when configured.*/
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ENV_UX_JOURNEY_AGENT_URL } from '@/lib/constants';

function isValidUrl(s: string): boolean {
    try {
        const u = new URL(s);
        return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
        return false;
    }
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { url?: string; task?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const url = typeof body?.url === 'string' ? body.url.trim() : '';
    const task = typeof body?.task === 'string' ? body.task.trim() : '';
    if (!url || !task) {
        return NextResponse.json(
            { error: 'Body must include url and task (non-empty strings).' },
            { status: 400 }
        );
    }
    if (!isValidUrl(url)) {
        return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 });
    }

    const agentBaseUrl = process.env[ENV_UX_JOURNEY_AGENT_URL];
    if (!agentBaseUrl) {
        return NextResponse.json(
            {
                error: 'UX Journey Agent service is not configured.',
                hint: 'Set UX_JOURNEY_AGENT_URL to the base URL of the Browser Use agent service.',
            },
            { status: 501 }
        );
    }

    const runUrl = agentBaseUrl.replace(/\/$/, '') + '/run';
    try {
        const res = await fetch(runUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, task }),
        });
        const data = (await res.json()) as { jobId?: string; error?: string };
        if (!res.ok) {
            return NextResponse.json(
                { error: data?.error || `Agent service error: ${res.status}` },
                { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
            );
        }
        if (!data?.jobId) {
            return NextResponse.json(
                { error: 'Agent service did not return a jobId.' },
                { status: 502 }
            );
        }
        return NextResponse.json({ success: true, jobId: data.jobId });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to reach UX Journey Agent service.';
        return NextResponse.json(
            { error: message },
            { status: 502 }
        );
    }
}
