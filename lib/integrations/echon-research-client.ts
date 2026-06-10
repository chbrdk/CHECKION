/**
 * ECHON research for CHECKION comprehensive reports.
 * Runs one persona-driven research chat per report (or fetches pinned thread as fallback).
 */

import {
    echonResearchChatPath,
    echonResearchThreadPath,
    getEchonReportResearchDepth,
    getEchonReportResearchTimeoutMs,
} from '@/lib/paths/echon-api';
import { echonServiceFetchJson } from '@/lib/integrations/echon-service-fetch';
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

export async function runEchonReportResearch(
    query: string,
    options?: { timeoutMs?: number }
): Promise<EchonMarketContext> {
    const trimmed = query.trim();
    if (!trimmed) {
        return emptyEchonMarketContext('echon_empty_query');
    }

    const timeoutMs = options?.timeoutMs ?? getEchonReportResearchTimeoutMs();
    const depth = getEchonReportResearchDepth();

    const res = await echonServiceFetchJson<EchonChatResponse>(
        echonResearchChatPath(),
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: trimmed,
                filters: { time_window_days: 30 },
                options: {
                    research_depth: depth,
                    top_k_signals: depth === 'fast' ? 12 : 20,
                    top_k_waves: depth === 'fast' ? 8 : 12,
                },
            }),
        },
        timeoutMs
    );

    if (!res.ok) {
        return emptyEchonMarketContext(res.reason);
    }

    const data = res.data;
    const threadId = typeof data.thread_id === 'string' ? data.thread_id : '';
    if (!threadId || !data.answer) {
        return emptyEchonMarketContext('echon_chat_response_invalid');
    }

    return parseEchonResearchAnswerToMarketContext(data.answer, {
        threadId,
        citationCount: Array.isArray(data.citations) ? data.citations.length : 0,
        capturedAt: new Date().toISOString(),
    });
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
    const res = await echonServiceFetchJson<unknown>(path, undefined, options?.timeoutMs ?? 25_000);
    if (!res.ok) {
        return emptyEchonMarketContext(res.reason);
    }

    return parseEchonThreadToMarketContext(res.data, id);
}
