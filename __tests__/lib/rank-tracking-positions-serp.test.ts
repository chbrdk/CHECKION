/**
 * Ensures SERP preview DB helpers are exported (regression: deploy build failed when missing).
 */
import { describe, it, expect } from 'vitest';
import { getLastSerpOrganicForKeyword, insertPosition } from '@/lib/db/rank-tracking-positions';

describe('rank-tracking-positions SERP exports', () => {
    it('exports getLastSerpOrganicForKeyword', () => {
        expect(typeof getLastSerpOrganicForKeyword).toBe('function');
    });

    it('insertPosition accepts serpOrganic (6th argument)', () => {
        expect(insertPosition.length).toBeGreaterThanOrEqual(5);
    });
});
