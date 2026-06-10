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

    it('returns polled thread context when research finishes on server', async () => {
        let polls = 0;
        const handlers = {
            createThread: vi.fn(async () => ({ ok: true as const, threadId: THREAD_ID })),
            startResearch: vi.fn(
                () =>
                    new Promise<{ ok: false; reason: string }>((resolve) => {
                        setTimeout(() => resolve({ ok: false, reason: 'echon_fetch_timeout' }), 30_000);
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
        expect(result.executiveSummary).toBe('Markt unter Druck.');
        expect(handlers.fetchThreadContext).toHaveBeenCalledTimes(3);
    });

    it('returns POST result when messages endpoint responds before poll sees answer', async () => {
        const handlers = {
            createThread: vi.fn(async () => ({ ok: true as const, threadId: THREAD_ID })),
            startResearch: vi.fn(async () => ({
                ok: true as const,
                context: readyContext,
            })),
            fetchThreadContext: vi.fn(async () => emptyEchonMarketContext('echon_no_structured_answer')),
            sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
            now: () => Date.now(),
        };

        const result = await waitForEchonResearchCompletion(handlers, {
            totalTimeoutMs: 60_000,
            pollIntervalMs: 10_000,
        });

        expect(result.available).toBe(true);
        expect(handlers.startResearch).toHaveBeenCalledWith(THREAD_ID);
    });

    it('times out with echon_poll_timeout when neither poll nor POST succeed', async () => {
        const handlers = {
            createThread: vi.fn(async () => ({ ok: true as const, threadId: THREAD_ID })),
            startResearch: vi.fn(
                () =>
                    new Promise<{ ok: false; reason: string }>((resolve) => {
                        setTimeout(() => resolve({ ok: false, reason: 'echon_fetch_timeout' }), 50_000);
                    })
            ),
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
    });

    it('calls onPoll on each attempt', async () => {
        const onPoll = vi.fn();
        const handlers = {
            createThread: vi.fn(async () => ({ ok: true as const, threadId: THREAD_ID })),
            startResearch: vi.fn(async () => ({
                ok: true as const,
                context: readyContext,
            })),
            fetchThreadContext: vi.fn(async () => emptyEchonMarketContext('echon_no_structured_answer')),
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
