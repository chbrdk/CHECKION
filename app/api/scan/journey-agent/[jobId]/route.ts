/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/journey-agent/[jobId]                     */
/*  Returns status and result of a UX Journey Agent run.              */
/*  Uses DB history when run is complete/error; else proxies to agent. */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { ENV_UX_JOURNEY_AGENT_URL } from '@/lib/constants';
import { getJourneyRun, upsertJourneyRunResult } from '@/lib/db/journey-runs';

function buildResponse(jobId: string, data: { status: string; result?: Record<string, unknown>; error?: string }) {
    const out = { ...data, jobId };
    if (out.result && typeof out.result === 'object' && jobId) {
        (out.result as Record<string, unknown>).videoUrl = `/api/scan/journey-agent/${encodeURIComponent(jobId)}/video`;
    }
    return NextResponse.json(out);
}

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

    const userId = session.user.id;

    const row = await getJourneyRun(jobId, userId);
    if (row && (row.status === 'complete' || row.status === 'error')) {
        return buildResponse(jobId, {
            status: row.status,
            result: row.result ?? undefined,
            error: row.error ?? undefined,
        });
    }

    const agentBaseUrl = process.env[ENV_UX_JOURNEY_AGENT_URL];
    if (!agentBaseUrl) {
        return apiError('UX Journey Agent service is not configured.', API_STATUS.NOT_IMPLEMENTED, { status: 'unavailable' });
    }

    const statusUrl = agentBaseUrl.replace(/\/$/, '') + '/run/' + encodeURIComponent(jobId);
    try {
        const res = await fetch(statusUrl);
        const data = (await res.json()) as { result?: Record<string, unknown>; status?: string; error?: string };
        if (!res.ok) {
            const status = res.status >= 400 && res.status < 600 ? res.status : 502;
            return apiError(data?.error || `Agent service error: ${res.status}`, status, { status: 'error' });
        }
        const status = data.status ?? 'running';
        if (status === 'complete' || status === 'error') {
            try {
                await upsertJourneyRunResult(jobId, userId, {
                    status: status as 'complete' | 'error',
                    result: data.result ?? undefined,
                    error: data.error,
                });
            } catch {
                // non-fatal
            }
        }
        return buildResponse(jobId, { status, result: data.result, error: data.error });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to reach UX Journey Agent service.';
        return apiError(message, API_STATUS.BAD_GATEWAY, { status: 'error' });
    }
}
