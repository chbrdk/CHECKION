import { describe, it, expect } from 'vitest';
import { stableRunnersKey } from '@/lib/standalone-scan-reuse';

describe('stableRunnersKey', () => {
    it('treats order of runners as irrelevant', () => {
        expect(stableRunnersKey(['htmlcs', 'axe'])).toBe(stableRunnersKey(['axe', 'htmlcs']));
    });

    it('serializes null', () => {
        expect(stableRunnersKey(null)).toBe('null');
    });
});
