import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitForEchonResearchCompletion } from '@/lib/integrations/echon-research-poll';
import { emptyEchonMarketContext } from '@/lib/project-report/echon-market-context';

const THREAD_ID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';

const readyContext = {
    available: true,
    threadId: THREAD_ID,
    executiveSummary: 'Markt unter Druck.',
};

describe('waitForEchonResearchCompletion', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns polled thread context while agent stream is still running', async () => {
        let polls = 0;
        const streamState = { threadId: THREAD_ID };
        const handlers = {
            getActiveThreadId: () => streamState.threadId,
            startAgentStream: vi.fn(
                () =>
                    new Promise<{ ok: true; threadId: string }>((resolve) => {
                        setTimeout(() => resolve({ ok: true, threadId: THREAD_ID }), 30_000);
                    })
            ),
            fetchThreadContext: vi.fn(async () => {
                polls += 1;
                if (polls < 3) {
                    return emptyEchonMarketContext('echon_no_structured_answer');
                }
                return readyContext;
            }),
            sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
            now: () => Date.now(),
        };

        const resultPromise = waitForEchonResearchCompletion(handlers, {
            totalTimeoutMs: 120_000,
            pollIntervalMs: 10_000,
        });

        await vi.advanceTimersByTimeAsync(25_000);
        const result = await resultPromise;

        expect(result.available).toBe(true);
        expect(handlers.fetchThreadContext).toHaveBeenCalledTimes(3);
    });

    it('keeps polling after async enqueue until final answer exists', async () => {
        let polls = 0;
        const handlers = {
            getActiveThreadId: () => null,
            startAgentStream: vi.fn(async () => ({ ok: true as const, threadId: THREAD_ID })),
            fetchThreadContext: vi.fn(async () => {
                polls += 1;
                if (polls < 5) {
                    return emptyEchonMarketContext('echon_no_structured_answer');
                }
                return readyContext;
            }),
            sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
            now: () => Date.now(),
        };

        const resultPromise = waitForEchonResearchCompletion(handlers, {
            totalTimeoutMs: 120_000,
            pollIntervalMs: 10_000,
        });

        await vi.advanceTimersByTimeAsync(50_000);
        const result = await resultPromise;

        expect(result.available).toBe(true);
        expect(polls).toBeGreaterThanOrEqual(5);
    });

    it('returns context when stream completes', async () => {
        const handlers = {
            getActiveThreadId: () => THREAD_ID,
            startAgentStream: vi.fn(async () => ({ ok: true as const, threadId: THREAD_ID })),
            fetchThreadContext: vi.fn(async () => readyContext),
            sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
            now: () => Date.now(),
        };

        const result = await waitForEchonResearchCompletion(handlers, {
            totalTimeoutMs: 60_000,
            pollIntervalMs: 10_000,
        });

        expect(result.available).toBe(true);
    });

    it('times out with echon_poll_timeout when stream fails recoverably but thread never completes', async () => {
        const handlers = {
            getActiveThreadId: () => THREAD_ID,
            startAgentStream: vi.fn(async () => ({
                ok: false as const,
                reason: 'echon_fetch_timeout',
                detail: 'proxy closed',
            })),
            fetchThreadContext: vi.fn(async () => emptyEchonMarketContext('echon_no_structured_answer')),
            sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
            now: () => Date.now(),
        };

        const resultPromise = waitForEchonResearchCompletion(handlers, {
            totalTimeoutMs: 20_000,
            pollIntervalMs: 5_000,
        });

        await vi.advanceTimersByTimeAsync(25_000);
        const result = await resultPromise;

        expect(result.available).toBe(false);
        expect(result.reason).toBe('echon_poll_timeout');
        expect(handlers.fetchThreadContext).toHaveBeenCalled();
    });

    it('calls onPoll once thread id is known', async () => {
        const onPoll = vi.fn();
        const handlers = {
            getActiveThreadId: () => THREAD_ID,
            startAgentStream: vi.fn(async () => ({ ok: true as const, threadId: THREAD_ID })),
            fetchThreadContext: vi.fn(async () => readyContext),
            sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
            now: () => Date.now(),
        };

        await waitForEchonResearchCompletion(handlers, {
            totalTimeoutMs: 60_000,
            pollIntervalMs: 10_000,
            onPoll,
        });

        expect(onPoll).toHaveBeenCalled();
        expect(onPoll.mock.calls[0][0]).toMatchObject({ threadId: THREAD_ID, attempt: 1 });
    });
});
