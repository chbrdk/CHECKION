import { describe, expect, it } from 'vitest';
import {
    extractPlatformCompanyIdFromSearchParams,
    normalizePlatformCompanyId,
    resolvePlatformCompanyIdForApi,
} from '@/lib/platform-company-context';

describe('platform-company-context', () => {
    it('normalizePlatformCompanyId trims and rejects empty / too long', () => {
        expect(normalizePlatformCompanyId('  abc  ')).toBe('abc');
        expect(normalizePlatformCompanyId('')).toBeNull();
        expect(normalizePlatformCompanyId('a'.repeat(65))).toBeNull();
    });

    it('extractPlatformCompanyIdFromSearchParams reads known keys', () => {
        const a = new URLSearchParams('platformCompanyId=co1');
        expect(extractPlatformCompanyIdFromSearchParams(a)).toBe('co1');
        const b = new URLSearchParams('platform_company_id=co2');
        expect(extractPlatformCompanyIdFromSearchParams(b)).toBe('co2');
    });

    it('resolvePlatformCompanyIdForApi prefers URL over options', () => {
        const p = new URLSearchParams('platformCompanyId=from-url');
        expect(resolvePlatformCompanyIdForApi(p, { plexonDefaultCompanyId: 'from-profile' })).toBe('from-url');
    });

    it('resolvePlatformCompanyIdForApi falls back to profile default', () => {
        expect(resolvePlatformCompanyIdForApi(null, { plexonDefaultCompanyId: '  x  ' })).toBe('x');
    });
});
