import { describe, it, expect } from 'vitest';
import {
    INDUSTRY_POOL_IDS,
    isIndustryPoolId,
    normalizeStoredProjectIndustry,
    industryPoolIdZod,
} from '@/lib/industry-pool';

describe('industry-pool', () => {
    it('has stable ids', () => {
        expect(INDUSTRY_POOL_IDS).toContain('software_saas');
        expect(INDUSTRY_POOL_IDS).toContain('other');
    });

    it('isIndustryPoolId', () => {
        expect(isIndustryPoolId('software_saas')).toBe(true);
        expect(isIndustryPoolId('not_a_pool')).toBe(false);
    });

    it('normalizeStoredProjectIndustry', () => {
        expect(normalizeStoredProjectIndustry('')).toBeNull();
        expect(normalizeStoredProjectIndustry('software_saas')).toBe('software_saas');
        expect(normalizeStoredProjectIndustry('  software_saas  ')).toBe('software_saas');
        expect(normalizeStoredProjectIndustry('Legacy free text')).toBe('Legacy free text');
    });

    it('industryPoolIdZod accepts pool only', () => {
        expect(industryPoolIdZod.safeParse('software_saas').success).toBe(true);
        expect(industryPoolIdZod.safeParse('nope').success).toBe(false);
    });
});
