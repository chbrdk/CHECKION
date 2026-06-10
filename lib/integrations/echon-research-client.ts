/**
 * ECHON research for CHECKION comprehensive reports.
 * Creates a thread, starts research in the background, polls GET /threads/{id} until done.
 */

import {
    echonResearchThreadMessagesPath,
    echonResearchThreadPath,
    echonResearchThreadsPath,
    getEchonReportResearchDepth,
    getEchonReportResearchPollIntervalMs,
    getEchonReportResearchPollRequestTimeoutMs,
    getEchonReportResearchStartRequestTimeoutMs,
    getEchonReportResearchTimeoutMs,
    type EchonReportResearchDepth,
} from '@/lib/paths/echon-api';
import { echonServiceFetchJson } from '@/lib/integrations/echon-service-fetch';
import {
    waitForEchonResearchCompletion,
    type EchonResearchPollAttempt,
} from '@/lib/integrations/echon-research-poll';
import {
    emptyEchonMarketContext,
    parseEchonResearchAnswerToMarketContext,
    parseEchonThreadToMarketContext,
    type EchonMarketContext,
} from '@/lib/project-report/echon-market-context';

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidEchonThreadId(threadId: string | null | undefined): boolean {
    const t = (threadId ?? '').trim();
    return t.length > 0 && UUID_RE.test(t);
}

type EchonChatResponse = {
    thread_id?: string;
    answer?: unknown;
    citations?: unknown[];
};

type EchonThreadSummary = {
    id?: string;
};

function buildResearchRequestBody(query: string, depth: EchonReportResearchDepth) {
    return {
        query,
        filters: { time_window_days: 30 },
        options: {
            research_depth: depth,
            top_k_signals: depth === 'fast' ? 12 : 20,
            top_k_waves: depth === 'fast' ? 8 : 12,
        },
    };
}

function contextFromChatResponse(
    data: EchonChatResponse,
    fallbackThreadId: string
): { ok: true; context: EchonMarketContext } | { ok: false; reason: string } {
    const threadId =
        typeof data.thread_id === 'string' && data.thread_id.trim()
            ? data.thread_id.trim()
            : fallbackThreadId;
    if (!data.answer) {
        return { ok: false, reason: 'echon_chat_response_invalid' };
    }
    const ctx = parseEchonResearchAnswerToMarketContext(data.answer, {
        threadId,
        citationCount: Array.isArray(data.citations) ? data.citations.length : 0,
        capturedAt: new Date().toISOString(),
    });
    if (!ctx.available) {
        return { ok: false, reason: ctx.reason ?? 'echon_no_structured_answer' };
    }
    return { ok: true, context: ctx };
}

async function createEchonResearchThread(): Promise<
    { ok: true; threadId: string } | { ok: false; reason: string }
> {
    const res = await echonServiceFetchJson<EchonThreadSummary>(
        echonResearchThreadsPath(),
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'CHECKION report research' }),
        },
        getEchonReportResearchStartRequestTimeoutMs()
    );
    if (!res.ok) {
        return { ok: false, reason: res.reason };
    }
    const threadId = typeof res.data.id === 'string' ? res.data.id.trim() : '';
    if (!isValidEchonThreadId(threadId)) {
        return { ok: false, reason: 'echon_thread_create_invalid' };
    }
    return { ok: true, threadId };
}

async function startEchonThreadResearch(
    threadId: string,
    query: string,
    timeoutMs: number
): Promise<{ ok: true; context: EchonMarketContext } | { ok: false; reason: string }> {
    const depth = getEchonReportResearchDepth();
    const res = await echonServiceFetchJson<EchonChatResponse>(
        echonResearchThreadMessagesPath(threadId),
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildResearchRequestBody(query, depth)),
        },
        timeoutMs
    );
    if (!res.ok) {
        return { ok: false, reason: res.reason };
    }
    return contextFromChatResponse(res.data, threadId);
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

    return waitForEchonResearchCompletion(
        {
            createThread: createEchonResearchThread,
            startResearch: (threadId) => startEchonThreadResearch(threadId, trimmed, totalTimeoutMs),
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
