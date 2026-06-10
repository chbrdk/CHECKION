/**
 * ECHON research agent stream (NDJSON) — same path as ECHON dashboard UI.
 * POST /api/v2/research/stream → ResearchAgentOrchestrator (discovery → plan → … → synthesis).
 */

import {
    echonIntegrationUrl,
    echonResearchStreamPath,
    getEchonReportResearchDepth,
    getEchonServiceToken,
    type EchonReportResearchDepth,
} from '@/lib/paths/echon-api';
import { mapEchonHttpFailure } from '@/lib/integrations/echon-service-fetch';

export type EchonResearchStreamEvent =
    | { type: 'stream.open'; ts?: string; schema_version?: string; thread_id?: string }
    | {
          type: 'stage.started' | 'stage.progress' | 'stage.result';
          thread_id?: string;
          stage?: string;
          payload?: Record<string, unknown>;
      }
    | { type: 'error'; message?: string }
    | { type: 'complete'; thread_id: string; assistant_message_id?: string; user_message_id?: string };

export type EchonResearchStreamResult =
    | { ok: true; threadId: string; assistantMessageId?: string }
    | { ok: false; reason: string; detail?: string };

export type RunEchonResearchStreamOptions = {
    timeoutMs: number;
    onEvent?: (event: EchonResearchStreamEvent) => void;
    onThreadId?: (threadId: string) => void;
};

function buildStreamRequestBody(query: string, depth: EchonReportResearchDepth) {
    return {
        query,
        thread_id: null,
        run_mode: 'full',
        filters: { time_window_days: 30 },
        options: {
            research_depth: depth,
            // Keep fast runs lighter — large retrieval (176+ signals) often hits proxy timeouts.
            top_k_signals: depth === 'fast' ? 12 : 30,
            top_k_waves: depth === 'fast' ? 6 : 10,
            sources: ['internal'],
        },
        client_capabilities: { ui: 'checkion-report-v1' },
    };
}

function parseNdjsonLine(line: string): EchonResearchStreamEvent | null {
    const trimmed = line.trim();
    if (!trimmed) return null;
    return JSON.parse(trimmed) as EchonResearchStreamEvent;
}

function threadIdFromEvent(evt: EchonResearchStreamEvent): string | null {
    if ('thread_id' in evt && typeof evt.thread_id === 'string' && evt.thread_id.trim()) {
        return evt.thread_id.trim();
    }
    return null;
}

export async function runEchonResearchAgentStream(
    query: string,
    options: RunEchonResearchStreamOptions
): Promise<EchonResearchStreamResult> {
    const trimmed = query.trim();
    if (!trimmed) {
        return { ok: false, reason: 'echon_empty_query' };
    }

    const url = echonIntegrationUrl(echonResearchStreamPath());
    const token = getEchonServiceToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/x-ndjson',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(buildStreamRequestBody(trimmed, getEchonReportResearchDepth())),
            signal: controller.signal,
            cache: 'no-store',
        });

        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            return {
                ok: false,
                reason: mapEchonHttpFailure(res.status, detail),
                detail: detail.slice(0, 400),
            };
        }

        if (!res.body) {
            return { ok: false, reason: 'echon_stream_empty' };
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let lastThreadId: string | null = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
                let evt: EchonResearchStreamEvent | null;
                try {
                    evt = parseNdjsonLine(line);
                } catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
                    return { ok: false, reason: 'echon_stream_parse_failed', detail: msg };
                }
                if (!evt) continue;

                options.onEvent?.(evt);

                const tid = threadIdFromEvent(evt);
                if (tid && tid !== lastThreadId) {
                    lastThreadId = tid;
                    options.onThreadId?.(tid);
                }

                if (evt.type === 'error') {
                    return {
                        ok: false,
                        reason: 'echon_stream_error',
                        detail: evt.message,
                    };
                }

                if (evt.type === 'complete') {
                    return {
                        ok: true,
                        threadId: evt.thread_id,
                        assistantMessageId: evt.assistant_message_id,
                    };
                }
            }
        }

        if (buffer.trim()) {
            const evt = parseNdjsonLine(buffer);
            if (evt?.type === 'complete') {
                return {
                    ok: true,
                    threadId: evt.thread_id,
                    assistantMessageId: evt.assistant_message_id,
                };
            }
        }

        return { ok: false, reason: 'echon_stream_incomplete' };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
            ok: false,
            reason: mapEchonHttpFailure(null, msg),
            detail: msg,
        };
    } finally {
        clearTimeout(timer);
    }
}
