import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchOnceMoreOn5xx } from '@/lib/fetch-retry-5xx';

describe('fetchOnceMoreOn5xx', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns first response when status is not 5xx', async () => {
        const ok = new Response(null, { status: 200 });
        const fn = vi.fn().mockResolvedValue(ok);
        const p = fetchOnceMoreOn5xx(fn, { delayMs: 100 });
        await vi.runAllTimersAsync();
        const res = await p;
        expect(res.status).toBe(200);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries once when first response is 5xx', async () => {
        const bad = new Response(null, { status: 503 });
        const ok = new Response(null, { status: 200 });
        const fn = vi.fn().mockResolvedValueOnce(bad).mockResolvedValueOnce(ok);
        const p = fetchOnceMoreOn5xx(fn, { delayMs: 100 });
        await vi.runAllTimersAsync();
        const res = await p;
        expect(res.status).toBe(200);
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('returns second 5xx without further retries', async () => {
        const bad = new Response(null, { status: 500 });
        const fn = vi.fn().mockResolvedValue(bad);
        const p = fetchOnceMoreOn5xx(fn, { delayMs: 50 });
        await vi.runAllTimersAsync();
        const res = await p;
        expect(res.status).toBe(500);
        expect(fn).toHaveBeenCalledTimes(2);
    });
});
