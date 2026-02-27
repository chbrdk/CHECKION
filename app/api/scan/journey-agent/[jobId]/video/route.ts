/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/journey-agent/[jobId]/video              */
/*  Proxies to agent's /run/[jobId]/video (recorded journey video).   */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { ENV_UX_JOURNEY_AGENT_URL } from '@/lib/constants';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
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

    const videoUrl = agentBaseUrl.replace(/\/$/, '') + '/run/' + encodeURIComponent(jobId) + '/video';
    try {
        const res = await fetch(videoUrl);
        if (!res.ok) {
            return apiError('Video not found', res.status as number);
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
        return apiError(message, API_STATUS.BAD_GATEWAY);
    }
}
