/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/journey-agent/[jobId]/live/stream        */
/*  Proxies to agent's MJPEG stream (live viewport).                 */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { ENV_UX_JOURNEY_AGENT_URL } from '@/lib/constants';
import { resolveJourneyRunProjectAssignmentContext } from '@/lib/db/journey-runs';
import { uxJourneyAgentEnabled } from '@/lib/ux-journey-agent-enabled';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    if (!uxJourneyAgentEnabled()) {
        return apiError('Not found', API_STATUS.NOT_FOUND);
    }

    const { jobId } = await params;
    if (!jobId) {
        return apiError('jobId required.', API_STATUS.BAD_REQUEST);
    }
    const access = await resolveJourneyRunProjectAssignmentContext(jobId, user.id);
    if (!access) {
        return apiError('Run not found.', API_STATUS.NOT_FOUND);
    }

    const agentBaseUrl = process.env[ENV_UX_JOURNEY_AGENT_URL];
    if (!agentBaseUrl) {
        return apiError('UX Journey Agent not configured.', API_STATUS.NOT_IMPLEMENTED);
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
        return apiError(message, API_STATUS.BAD_GATEWAY);
    }
}
