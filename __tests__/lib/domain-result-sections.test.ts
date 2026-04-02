import { describe, expect, it } from 'vitest';
import {
    getDomainSectionFromPathname,
    pathDomainSection,
    DOMAIN_RESULT_NAV_SLUGS,
} from '@/lib/domain-result-sections';

describe('domain result sections', () => {
    it('pathDomainSection builds overview and subpaths', () => {
        expect(pathDomainSection('abc', 'overview')).toBe('/domain/abc');
        expect(pathDomainSection('abc', 'links-seo')).toBe('/domain/abc/links-seo');
        expect(pathDomainSection('abc', 'journey', { restoreJourney: 'x' })).toBe('/domain/abc/journey?restoreJourney=x');
    });

    it('getDomainSectionFromPathname maps URL to logical section', () => {
        expect(getDomainSectionFromPathname('/domain/xyz', 'xyz')).toBe('overview');
        expect(getDomainSectionFromPathname('/domain/xyz/links-seo', 'xyz')).toBe('links-seo');
        expect(getDomainSectionFromPathname('/domain/xyz/list-details', 'xyz')).toBe('list-details');
    });

    it('DOMAIN_RESULT_NAV_SLUGS has expected segments', () => {
        expect(DOMAIN_RESULT_NAV_SLUGS).toContain('links-seo');
        expect(DOMAIN_RESULT_NAV_SLUGS).toContain('journey');
    });
});
