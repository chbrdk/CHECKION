/**
 * Poll ECHON research thread until structured assistant answer is available.
 * Used when POST /messages may run for several minutes (proxy-safe via short GETs).
 */

import type { EchonMarketContext } from '@/lib/project-report/echon-market-context';
import { emptyEchonMarketContext } from '@/lib/project-report/echon-market-context';

export type EchonResearchPollAttempt = {
    threadId: string;
    attempt: number;
    elapsedMs: number;
};

export type EchonResearchStartResult =
    | { ok: true; context: EchonMarketContext }
    | { ok: false; reason: string };

export type EchonResearchPollHandlers = {
    createThread: () => Promise<{ ok: true; threadId: string } | { ok: false; reason: string }>;
    startResearch: (threadId: string) => Promise<EchonResearchStartResult>;
    fetchThreadContext: (threadId: string) => Promise<EchonMarketContext>;
    sleep: (ms: number) => Promise<void>;
    now: () => number;
};

export async function waitForEchonResearchCompletion(
    handlers: EchonResearchPollHandlers,
    options: {
        totalTimeoutMs: number;
        pollIntervalMs: number;
        onPoll?: (attempt: EchonResearchPollAttempt) => void | Promise<void>;
    }
): Promise<EchonMarketContext> {
    const created = await handlers.createThread();
    if (!created.ok) {
        return emptyEchonMarketContext(created.reason);
    }

    const threadId = created.threadId;
    const startedAt = handlers.now();
    const deadline = startedAt + options.totalTimeoutMs;
    const researchPromise = handlers.startResearch(threadId);

    let attempt = 0;
    let lastReason = 'echon_research_pending';

    while (handlers.now() < deadline) {
        attempt += 1;
        const elapsedMs = handlers.now() - startedAt;
        if (options.onPoll) {
            await options.onPoll({ threadId, attempt, elapsedMs });
        }

        const polled = await handlers.fetchThreadContext(threadId);
        if (polled.available) {
            return polled;
        }

        const remaining = deadline - handlers.now();
        if (remaining <= 0) {
            break;
        }

        const tickMs = Math.min(options.pollIntervalMs, remaining);
        const raced = await Promise.race([
            researchPromise.then((res) => ({ kind: 'research' as const, res })),
            handlers.sleep(tickMs).then(() => ({ kind: 'tick' as const })),
        ]);

        if (raced.kind === 'research') {
            if (raced.res.ok) {
                return raced.res.context;
            }
            lastReason = raced.res.reason;
        }
    }

    const finalPoll = await handlers.fetchThreadContext(threadId);
    if (finalPoll.available) {
        return finalPoll;
    }

    const researchResult = await Promise.race([
        researchPromise.catch(
            (): EchonResearchStartResult => ({ ok: false, reason: 'echon_fetch_failed' })
        ),
        handlers.sleep(0).then(
            (): EchonResearchStartResult => ({ ok: false, reason: 'echon_research_pending' })
        ),
    ]);
    if (researchResult.ok) {
        return researchResult.context;
    }
    if (researchResult.reason && researchResult.reason !== 'echon_research_pending') {
        lastReason = researchResult.reason;
    }

    return emptyEchonMarketContext(
        lastReason === 'echon_research_pending' ? 'echon_poll_timeout' : lastReason
    );
}
