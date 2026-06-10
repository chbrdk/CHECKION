/**
 * ECHON research for CHECKION comprehensive reports.
 * Uses POST /api/v2/research/stream (research agent) + GET /threads/{id} polling.
 */

import {
    getEchonReportResearchPollIntervalMs,
    getEchonReportResearchPollRequestTimeoutMs,
    getEchonReportResearchTimeoutMs,
} from '@/lib/paths/echon-api';
import {
    waitForEchonResearchCompletion,
    type EchonResearchPollAttempt,
} from '@/lib/integrations/echon-research-poll';
import { runEchonResearchAgentStream } from '@/lib/integrations/echon-research-stream-client';
import { echonServiceFetchJson } from '@/lib/integrations/echon-service-fetch';
import { echonResearchThreadPath } from '@/lib/paths/echon-api';
import {
    emptyEchonMarketContext,
    parseEchonThreadToMarketContext,
    type EchonMarketContext,
} from '@/lib/project-report/echon-market-context';

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidEchonThreadId(threadId: string | null | undefined): boolean {
    const t = (threadId ?? '').trim();
    return t.length > 0 && UUID_RE.test(t);
}

export async function fetchEchonMarketContext(
    threadId: string,
    options?: { timeoutMs?: number }
): Promise<EchonMarketContext> {
    const id = threadId.trim();
    if (!isValidEchonThreadId(id)) {
        return emptyEchonMarketContext('echon_invalid_thread_id');
    }

    const path = echonResearchThreadPath(id);
    const res = await echonServiceFetchJson<unknown>(
        path,
        undefined,
        options?.timeoutMs ?? getEchonReportResearchPollRequestTimeoutMs()
    );
    if (!res.ok) {
        return emptyEchonMarketContext(res.reason);
    }

    return parseEchonThreadToMarketContext(res.data, id);
}

export async function runEchonReportResearch(
    query: string,
    options?: {
        timeoutMs?: number;
        onPoll?: (attempt: EchonResearchPollAttempt) => void | Promise<void>;
    }
): Promise<EchonMarketContext> {
    const trimmed = query.trim();
    if (!trimmed) {
        return emptyEchonMarketContext('echon_empty_query');
    }

    const totalTimeoutMs = options?.timeoutMs ?? getEchonReportResearchTimeoutMs();
    const pollIntervalMs = getEchonReportResearchPollIntervalMs();
    const pollRequestTimeoutMs = getEchonReportResearchPollRequestTimeoutMs();
    const streamState = { threadId: null as string | null };

    return waitForEchonResearchCompletion(
        {
            getActiveThreadId: () => streamState.threadId,
            startAgentStream: () =>
                runEchonResearchAgentStream(trimmed, {
                    timeoutMs: totalTimeoutMs,
                    onThreadId: (threadId) => {
                        streamState.threadId = threadId;
                    },
                }).then((res) =>
                    res.ok
                        ? { ok: true as const, threadId: res.threadId }
                        : { ok: false as const, reason: res.reason, detail: res.detail }
                ),
            fetchThreadContext: (threadId) =>
                fetchEchonMarketContext(threadId, { timeoutMs: pollRequestTimeoutMs }),
            sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
            now: () => Date.now(),
        },
        {
            totalTimeoutMs,
            pollIntervalMs,
            onPoll: options?.onPoll,
        }
    );
}

/** @deprecated Pinned-thread fallback only */
export async function fetchEchonMarketContextById(
    threadId: string,
    options?: { timeoutMs?: number }
): Promise<EchonMarketContext> {
    return fetchEchonMarketContext(threadId, options);
}
