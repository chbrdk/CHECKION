import { describe, it, expect } from 'vitest';
import { domainScanListProjectCacheKey } from '@/lib/cache';

describe('domainScanListProjectCacheKey', () => {
    it('distinguishes all scans from unassigned-only (null project_id)', () => {
        expect(domainScanListProjectCacheKey(undefined)).toBe('all');
        expect(domainScanListProjectCacheKey(null)).toBe('unassigned');
        expect(domainScanListProjectCacheKey('p1')).toBe('p1');
    });
});
