import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ENV_DATABASE_POOL_MAX } from '@/lib/constants';

describe('getDatabasePoolMax', () => {
    const original = process.env[ENV_DATABASE_POOL_MAX];

    beforeEach(() => {
        delete process.env[ENV_DATABASE_POOL_MAX];
        vi.resetModules();
    });

    afterEach(() => {
        if (original === undefined) delete process.env[ENV_DATABASE_POOL_MAX];
        else process.env[ENV_DATABASE_POOL_MAX] = original;
    });

    it('defaults to 10 when unset', async () => {
        const { getDatabasePoolMax } = await import('@/lib/db/pool-config');
        expect(getDatabasePoolMax()).toBe(10);
    });

    it('uses DATABASE_POOL_MAX when set', async () => {
        process.env[ENV_DATABASE_POOL_MAX] = '25';
        const { getDatabasePoolMax } = await import('@/lib/db/pool-config');
        expect(getDatabasePoolMax()).toBe(25);
    });

    it('clamps to 1–100', async () => {
        process.env[ENV_DATABASE_POOL_MAX] = '0';
        let { getDatabasePoolMax } = await import('@/lib/db/pool-config');
        expect(getDatabasePoolMax()).toBe(1);

        vi.resetModules();
        process.env[ENV_DATABASE_POOL_MAX] = '500';
        ({ getDatabasePoolMax } = await import('@/lib/db/pool-config'));
        expect(getDatabasePoolMax()).toBe(100);
    });
});
