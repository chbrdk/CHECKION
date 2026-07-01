import { describe, expect, it } from 'vitest';
import { isOutsideNextCacheContextError } from '@/lib/cache';

describe('cache invalidation helpers', () => {
    it('detects revalidateTag outside Next.js static generation context', () => {
        expect(
            isOutsideNextCacheContextError(
                new Error('Invariant: static generation store missing in revalidateTag domain-list-u1')
            )
        ).toBe(true);
    });

    it('does not treat unrelated errors as outside-context', () => {
        expect(isOutsideNextCacheContextError(new Error('database connection failed'))).toBe(false);
    });
});
