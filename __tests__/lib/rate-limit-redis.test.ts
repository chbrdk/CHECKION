import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('rate-limit-redis', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        delete process.env.REDIS_URL;
        delete process.env.CHECKION_DISABLE_REDIS_RATE_LIMIT;
    });

    it('CHECKION_DISABLE_REDIS_RATE_LIMIT=1 skips Redis without connecting', async () => {
        process.env.REDIS_URL = 'redis://example.invalid:6379';
        process.env.CHECKION_DISABLE_REDIS_RATE_LIMIT = '1';
        const mod = await import('@/lib/rate-limit-redis');
        mod.__resetRedisClientForTests();
        const r = await mod.checkRateLimitRedis('key1', 'default', 10, 60_000);
        expect(r).toBeNull();
    });
});
