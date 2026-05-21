/**
 * SERP market constants
 */
import { describe, it, expect } from 'vitest';
import { SERP_PREVIEW_DISPLAY_LIMIT, SERP_NUM_PAGES } from '@/lib/serp-markets';

describe('serp-markets', () => {
    it('preview limit matches one Serper results page', () => {
        expect(SERP_PREVIEW_DISPLAY_LIMIT).toBe(10);
        expect(SERP_NUM_PAGES).toBeGreaterThanOrEqual(1);
    });
});
