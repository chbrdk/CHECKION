/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/journey-agent/[jobId]/live               */
/*  Proxies to agent's /run/[jobId]/live (live viewport frame).       */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { ENV_UX_JOURNEY_AGENT_URL } from '@/lib/constants';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }

    const { jobId } = await params;
    if (!jobId) {
        return apiError('jobId required.', API_STATUS.BAD_REQUEST);
    }

    const agentBaseUrl = process.env[ENV_UX_JOURNEY_AGENT_URL];
    if (!agentBaseUrl) {
        return apiError('UX Journey Agent not configured.', API_STATUS.NOT_IMPLEMENTED);
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
        return apiError(message, API_STATUS.BAD_GATEWAY);
    }
}
