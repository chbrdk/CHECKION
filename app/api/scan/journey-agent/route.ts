/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan/journey-agent (UX Journey Agent)        */
/*  Starts a browser-agent run (URL + natural language task).        */
/*  Delegates to Python service (Browser Use + Claude) when configured.*/
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, journeyAgentBodySchema } from '@/lib/api-schemas';
import { checkRateLimit } from '@/lib/rate-limit';
import { ENV_UX_JOURNEY_AGENT_URL } from '@/lib/constants';
import { insertJourneyRun } from '@/lib/db/journey-runs';
import { reportUsage } from '@/lib/usage-report';

export async function POST(request: NextRequest) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const rl = checkRateLimit(`scan:${user.id}`);
    if (!rl.allowed) {
        return apiError(
            'Too many requests. Please try again later.',
            API_STATUS.TOO_MANY_REQUESTS,
            rl.retryAfter ? { retryAfter: rl.retryAfter } : undefined
        );
    }

    const parsed = await parseApiBody(request, journeyAgentBodySchema);
    if (parsed instanceof NextResponse) return parsed;
    const { url, task, projectId } = parsed;

    const agentBaseUrl = process.env[ENV_UX_JOURNEY_AGENT_URL];
    if (!agentBaseUrl) {
        return apiError(
            'UX Journey Agent service is not configured.',
            API_STATUS.NOT_IMPLEMENTED,
            { hint: 'Set UX_JOURNEY_AGENT_URL to the base URL of the Browser Use agent service.' }
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
            const status = res.status >= 400 && res.status < 600 ? res.status : 502;
            return apiError(data?.error || `Agent service error: ${res.status}`, status);
        }
        if (!data?.jobId) {
            return apiError('Agent service did not return a jobId.', API_STATUS.BAD_GATEWAY);
        }
        const jobId = data.jobId as string;
        try {
            await insertJourneyRun(jobId, user.id, url, task, projectId !== undefined ? { projectId } : undefined);
        } catch (err) {
            // non-fatal: history unavailable if table missing or DB error
            console.warn('[journey-agent] Could not save run to history:', err instanceof Error ? err.message : err);
        }
        reportUsage({
          userId: user.id,
          eventType: 'journey_agent',
          rawUnits: { job: 1 },
          idempotencyKey: `journey_agent:${jobId}`,
        });
        return NextResponse.json({ success: true, jobId });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to reach UX Journey Agent service.';
        return apiError(message, API_STATUS.BAD_GATEWAY);
    }
}
