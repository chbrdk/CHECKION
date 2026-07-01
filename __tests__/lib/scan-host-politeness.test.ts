import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { __resetHostPolitenessForTests, runWithHostPoliteness } from '@/lib/scan-host-politeness';

describe('scan-host-politeness', () => {
    beforeEach(() => {
        __resetHostPolitenessForTests();
    });

    afterEach(() => {
        __resetHostPolitenessForTests();
    });

    it('serializes concurrent work for the same host', async () => {
        let active = 0;
        let maxActive = 0;
        const work = async () => {
            active += 1;
            maxActive = Math.max(maxActive, active);
            await new Promise((resolve) => setTimeout(resolve, 5));
            active -= 1;
        };
        await Promise.all([
            runWithHostPoliteness('https://example.com/a', work),
            runWithHostPoliteness('https://www.example.com/b', work),
        ]);
        expect(maxActive).toBe(1);
    });
});
