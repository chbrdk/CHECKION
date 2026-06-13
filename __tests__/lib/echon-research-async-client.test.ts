import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enqueueEchonResearchRun } from '@/lib/integrations/echon-research-async-client';
import { echonResearchRunsPath } from '@/lib/paths/echon-api';

describe('enqueueEchonResearchRun', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        globalThis.fetch = vi.fn(async () => {
            return new Response(
                JSON.stringify({ run_id: 'run-1', thread_id: '11111111-1111-4111-8111-111111111111', status: 'queued' }),
                { status: 202, headers: { 'Content-Type': 'application/json' } }
            );
        }) as typeof fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.restoreAllMocks();
    });

    it('POSTs to /api/v2/research/runs and returns threadId', async () => {
        const res = await enqueueEchonResearchRun('market trends in EV charging');
        expect(res.ok).toBe(true);
        if (res.ok) {
            expect(res.threadId).toBe('11111111-1111-4111-8111-111111111111');
            expect(res.runId).toBe('run-1');
        }
        const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
        expect(url).toContain(echonResearchRunsPath());
    });

    it('retries on 503 then succeeds', async () => {
        vi.useFakeTimers();
        (globalThis.fetch as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce(new Response('busy', { status: 503 }))
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({ run_id: 'run-2', thread_id: '22222222-2222-4222-8222-222222222222' }),
                    { status: 202, headers: { 'Content-Type': 'application/json' } }
                )
            );
        const promise = enqueueEchonResearchRun('query');
        await vi.advanceTimersByTimeAsync(20_000);
        const res = await promise;
        vi.useRealTimers();
        expect(res.ok).toBe(true);
        expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
    });
});
