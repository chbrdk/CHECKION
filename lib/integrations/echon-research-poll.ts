/**
 * Poll ECHON research thread while the agent stream runs (GET /threads/{id}).
 */

import type { EchonMarketContext } from '@/lib/project-report/echon-market-context';
import { emptyEchonMarketContext } from '@/lib/project-report/echon-market-context';
import {
    isFatalEchonStreamFailure,
    isRecoverableEchonStreamFailure,
} from '@/lib/integrations/echon-stream-failure';

export type EchonResearchPollAttempt = {
    threadId: string;
    attempt: number;
    elapsedMs: number;
};

export type EchonResearchStreamStartResult =
    | { ok: true; threadId: string }
    | { ok: false; reason: string; detail?: string };

export type EchonResearchPollHandlers = {
    /** Starts ECHON research agent stream (same as dashboard). Resolves when stream completes. */
    startAgentStream: () => Promise<EchonResearchStreamStartResult>;
    fetchThreadContext: (threadId: string) => Promise<EchonMarketContext>;
    sleep: (ms: number) => Promise<void>;
    now: () => number;
    /** Thread id from first stream stage event (before complete). */
    getActiveThreadId?: () => string | null;
};

function applyStreamResult(
    res: EchonResearchStreamStartResult,
    activeThreadId: string | null
): { activeThreadId: string | null; fatal: EchonMarketContext | null; lastReason: string } {
    if (res.ok) {
        return { activeThreadId: res.threadId, fatal: null, lastReason: 'echon_research_pending' };
    }
    if (isFatalEchonStreamFailure(res.reason)) {
        return {
            activeThreadId,
            fatal: emptyEchonMarketContext(res.reason, res.detail),
            lastReason: res.reason,
        };
    }
    if (!isRecoverableEchonStreamFailure(res.reason) && !activeThreadId) {
        return {
            activeThreadId,
            fatal: emptyEchonMarketContext(res.reason, res.detail),
            lastReason: res.reason,
        };
    }
    return { activeThreadId, fatal: null, lastReason: res.reason };
}

export async function waitForEchonResearchCompletion(
    handlers: EchonResearchPollHandlers,
    options: {
        totalTimeoutMs: number;
        pollIntervalMs: number;
        onPoll?: (attempt: EchonResearchPollAttempt) => void | Promise<void>;
    }
): Promise<EchonMarketContext> {
    let activeThreadId: string | null = null;
    let streamResult: EchonResearchStreamStartResult | null = null;
    const streamPromise = handlers.startAgentStream().then((res) => {
        streamResult = res;
        return res;
    });

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

        if (streamResult === null) {
            const raced = await Promise.race([
                streamPromise.then((res) => ({ kind: 'stream' as const, res })),
                handlers.sleep(tickMs).then(() => ({ kind: 'tick' as const })),
            ]);

            if (raced.kind === 'stream') {
                const applied = applyStreamResult(raced.res, activeThreadId);
                if (applied.fatal) {
                    return applied.fatal;
                }
                activeThreadId = applied.activeThreadId ?? activeThreadId;
                lastReason = applied.lastReason;

                if (raced.res.ok) {
                    const ctx = await handlers.fetchThreadContext(raced.res.threadId);
                    if (ctx.available) {
                        return ctx;
                    }
                    break;
                }
            }
        } else {
            await handlers.sleep(tickMs);
        }
    }

    if (activeThreadId) {
        const finalPoll = await handlers.fetchThreadContext(activeThreadId);
        if (finalPoll.available) {
            return finalPoll;
        }
    }

    if (streamResult === null) {
        streamResult = await streamPromise.catch(
            (): EchonResearchStreamStartResult => ({ ok: false, reason: 'echon_fetch_failed' })
        );
    }

    if (streamResult.ok) {
        const ctx = await handlers.fetchThreadContext(streamResult.threadId);
        if (ctx.available) {
            return ctx;
        }
    } else if (streamResult.reason) {
        lastReason = streamResult.reason;
        if (isFatalEchonStreamFailure(streamResult.reason)) {
            return emptyEchonMarketContext(lastReason, streamResult.detail);
        }
    }

    return emptyEchonMarketContext(
        lastReason === 'echon_research_pending' || isRecoverableEchonStreamFailure(lastReason)
            ? 'echon_poll_timeout'
            : lastReason
    );
}
