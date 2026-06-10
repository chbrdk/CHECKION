/**
 * Poll ECHON research thread while the agent stream runs (GET /threads/{id}).
 */

import type { EchonMarketContext } from '@/lib/project-report/echon-market-context';
import { emptyEchonMarketContext } from '@/lib/project-report/echon-market-context';

export type EchonResearchPollAttempt = {
    threadId: string;
    attempt: number;
    elapsedMs: number;
};

export type EchonResearchStreamStartResult =
    | { ok: true; threadId: string }
    | { ok: false; reason: string };

export type EchonResearchPollHandlers = {
    /** Starts ECHON research agent stream (same as dashboard). Resolves when stream completes. */
    startAgentStream: () => Promise<EchonResearchStreamStartResult>;
    fetchThreadContext: (threadId: string) => Promise<EchonMarketContext>;
    sleep: (ms: number) => Promise<void>;
    now: () => number;
    /** Thread id from first stream stage event (before complete). */
    getActiveThreadId?: () => string | null;
};

export async function waitForEchonResearchCompletion(
    handlers: EchonResearchPollHandlers,
    options: {
        totalTimeoutMs: number;
        pollIntervalMs: number;
        onPoll?: (attempt: EchonResearchPollAttempt) => void | Promise<void>;
    }
): Promise<EchonMarketContext> {
    let activeThreadId: string | null = null;
    const streamPromise = handlers.startAgentStream();

    const startedAt = handlers.now();
    const deadline = startedAt + options.totalTimeoutMs;
    let attempt = 0;
    let lastReason = 'echon_research_pending';

    while (handlers.now() < deadline) {
        if (!activeThreadId && handlers.getActiveThreadId) {
            activeThreadId = handlers.getActiveThreadId();
        }

        attempt += 1;
        const elapsedMs = handlers.now() - startedAt;

        if (activeThreadId) {
            if (options.onPoll) {
                await options.onPoll({ threadId: activeThreadId, attempt, elapsedMs });
            }

            const polled = await handlers.fetchThreadContext(activeThreadId);
            if (polled.available) {
                return polled;
            }
        }

        const remaining = deadline - handlers.now();
        if (remaining <= 0) {
            break;
        }

        const tickMs = Math.min(options.pollIntervalMs, remaining);
        const raced = await Promise.race([
            streamPromise.then((res) => ({ kind: 'stream' as const, res })),
            handlers.sleep(tickMs).then(() => ({ kind: 'tick' as const })),
        ]);

        if (raced.kind === 'stream') {
            if (raced.res.ok) {
                activeThreadId = raced.res.threadId;
                const ctx = await handlers.fetchThreadContext(raced.res.threadId);
                if (ctx.available) {
                    return ctx;
                }
                break;
            }
            lastReason = raced.res.reason;
            if (!activeThreadId) {
                break;
            }
        }
    }

    if (activeThreadId) {
        const finalPoll = await handlers.fetchThreadContext(activeThreadId);
        if (finalPoll.available) {
            return finalPoll;
        }
    }

    const streamResult = await Promise.race([
        streamPromise.catch((): EchonResearchStreamStartResult => ({ ok: false, reason: 'echon_fetch_failed' })),
        handlers.sleep(0).then((): EchonResearchStreamStartResult => ({ ok: false, reason: 'echon_research_pending' })),
    ]);

    if (streamResult.ok) {
        const ctx = await handlers.fetchThreadContext(streamResult.threadId);
        if (ctx.available) {
            return ctx;
        }
    } else if (streamResult.reason && streamResult.reason !== 'echon_research_pending') {
        lastReason = streamResult.reason;
    }

    return emptyEchonMarketContext(
        lastReason === 'echon_research_pending' ? 'echon_poll_timeout' : lastReason
    );
}
