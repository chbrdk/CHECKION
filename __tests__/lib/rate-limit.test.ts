import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('rate-limit', () => {
    beforeEach(async () => {
        vi.resetModules();
        process.env.RATE_LIMIT_SCAN_MAX = '3';
        process.env.RATE_LIMIT_SCAN_WINDOW_MS = '60000';
        process.env.RATE_LIMIT_REGISTER_MAX = '2';
        process.env.RATE_LIMIT_REGISTER_WINDOW_MS = '60000';
        const mod = await import('@/lib/rate-limit');
        mod.__resetRateLimitStoresForTests();
    });

    afterEach(() => {
        delete process.env.RATE_LIMIT_SCAN_MAX;
        delete process.env.RATE_LIMIT_SCAN_WINDOW_MS;
        delete process.env.RATE_LIMIT_REGISTER_MAX;
        delete process.env.RATE_LIMIT_REGISTER_WINDOW_MS;
    });

    it('getClientIpForRateLimit prefers first X-Forwarded-For hop', async () => {
        const { getClientIpForRateLimit } = await import('@/lib/rate-limit');
        const req = new Request('http://localhost/api', {
            headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' },
        });
        expect(getClientIpForRateLimit(req)).toBe('203.0.113.1');
    });

    it('register bucket is independent of default bucket', async () => {
        const { checkRateLimit, __resetRateLimitStoresForTests } = await import('@/lib/rate-limit');
        __resetRateLimitStoresForTests();

        for (let i = 0; i < 3; i++) {
            expect((await checkRateLimit(`scan:user1`, 'default')).allowed).toBe(true);
        }
        expect((await checkRateLimit(`scan:user1`, 'default')).allowed).toBe(false);

        expect((await checkRateLimit(`register:203.0.113.1`, 'register')).allowed).toBe(true);
        expect((await checkRateLimit(`register:203.0.113.1`, 'register')).allowed).toBe(true);
        expect((await checkRateLimit(`register:203.0.113.1`, 'register')).allowed).toBe(false);
    });
});
