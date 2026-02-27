/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/share/[token]/video (public, no auth)         */
/*  Streams journey recording for a valid journey share token.        */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getCachedShareByToken } from '@/lib/cache';
import { getJourneyRun } from '@/lib/db/journey-runs';
import { ENV_UX_JOURNEY_AGENT_URL } from '@/lib/constants';
import { canAccessShare } from '@/lib/share-access';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;
    const share = await getCachedShareByToken(token);
    if (!share || share.resourceType !== 'journey') {
        return apiError('Share not found or not a journey share', API_STATUS.NOT_FOUND);
    }
    if (!canAccessShare(share.passwordHash, request, token)) {
        return apiError('Password required', API_STATUS.FORBIDDEN, { requiresPassword: true });
    }

    const run = await getJourneyRun(share.resourceId, share.userId);
    if (!run || run.status !== 'complete') {
        return apiError('Journey not found', API_STATUS.NOT_FOUND);
    }

    const agentBaseUrl = process.env[ENV_UX_JOURNEY_AGENT_URL];
    if (!agentBaseUrl) {
        return apiError('Journey video not available', API_STATUS.UNAVAILABLE);
    }

    const jobId = share.resourceId;
    const videoUrl = agentBaseUrl.replace(/\/$/, '') + '/run/' + encodeURIComponent(jobId) + '/video';
    try {
        const res = await fetch(videoUrl);
        if (!res.ok) {
            return apiError('Video not found', res.status as 404 | 502);
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
