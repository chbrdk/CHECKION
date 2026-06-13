/**
 * Fire-and-forget ECHON research — POST /runs, poll GET /threads/{id}.
 * Does not hold a long-lived HTTP stream (keeps API workers free).
 */

import {
    echonIntegrationUrl,
    echonResearchRunsPath,
    getEchonReportResearchDepth,
    getEchonReportResearchStartRequestTimeoutMs,
    getEchonServiceToken,
    type EchonReportResearchDepth,
} from '@/lib/paths/echon-api';
import { mapEchonHttpFailure } from '@/lib/integrations/echon-service-fetch';

export type EchonResearchEnqueueResult =
    | { ok: true; threadId: string; runId: string }
    | { ok: false; reason: string; detail?: string };

function buildEnqueueRequestBody(query: string, depth: EchonReportResearchDepth) {
    return {
        query,
        thread_id: null,
        run_mode: 'full',
        filters: { time_window_days: 30 },
        options: {
            research_depth: depth,
            top_k_signals: depth === 'fast' ? 12 : 30,
            top_k_waves: depth === 'fast' ? 6 : 10,
            sources: ['internal'],
        },
        client_capabilities: { ui: 'checkion-report-v1', mode: 'async-enqueue' },
    };
}

const ENQUEUE_MAX_ATTEMPTS = 4;
const ENQUEUE_RETRY_MS = [0, 15_000, 45_000, 90_000];

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function enqueueEchonResearchRun(
    query: string,
    options?: { depth?: EchonReportResearchDepth }
): Promise<EchonResearchEnqueueResult> {
    const trimmed = query.trim();
    if (!trimmed) {
        return { ok: false, reason: 'echon_empty_query' };
    }

    const url = echonIntegrationUrl(echonResearchRunsPath());
    const token = getEchonServiceToken();
    const depth = options?.depth ?? getEchonReportResearchDepth();
    const timeoutMs = getEchonReportResearchStartRequestTimeoutMs();

    for (let attempt = 0; attempt < ENQUEUE_MAX_ATTEMPTS; attempt += 1) {
        if (attempt > 0) {
            await sleep(ENQUEUE_RETRY_MS[attempt] ?? 60_000);
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(buildEnqueueRequestBody(trimmed, depth)),
                signal: controller.signal,
            });

            if (res.status === 503) {
                const detail = await res.text().catch(() => '');
                if (attempt < ENQUEUE_MAX_ATTEMPTS - 1) {
                    continue;
                }
                return { ok: false, reason: 'echon_http_503', detail: detail.slice(0, 500) };
            }

            if (!res.ok) {
                const detail = await res.text().catch(() => '');
                return { ok: false, reason: mapEchonHttpFailure(res.status, detail), detail: detail.slice(0, 500) };
            }

            const data = (await res.json()) as {
                run_id?: string;
                thread_id?: string;
            };
            const threadId = (data.thread_id ?? '').trim();
            const runId = (data.run_id ?? '').trim();
            if (!threadId) {
                return { ok: false, reason: 'echon_enqueue_missing_thread_id' };
            }
            return { ok: true, threadId, runId };
        } catch (err) {
            if (attempt < ENQUEUE_MAX_ATTEMPTS - 1) {
                continue;
            }
            const isAbort = err instanceof Error && err.name === 'AbortError';
            return {
                ok: false,
                reason: isAbort ? 'echon_fetch_timeout' : 'echon_fetch_failed',
                detail: err instanceof Error ? err.message : String(err),
            };
        } finally {
            clearTimeout(timer);
        }
    }

    return { ok: false, reason: 'echon_http_503' };
}
