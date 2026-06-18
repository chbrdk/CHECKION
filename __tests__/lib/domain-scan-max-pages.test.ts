import { describe, expect, it } from 'vitest';
import {
    DOMAIN_SCAN_DEFAULT_MAX_PAGES,
    DOMAIN_SCAN_MAX_PAGES_CAP,
    DOMAIN_SCAN_MAX_PAGES_PRESETS,
    buildDomainScanMaxPagesSelectOptions,
    parseDomainScanMaxPagesParam,
    resolveDomainScanMaxPages,
} from '@/lib/domain-scan-max-pages';

describe('domain-scan-max-pages', () => {
    it('resolveDomainScanMaxPages clamps to cap and minimum', () => {
        expect(resolveDomainScanMaxPages()).toBe(DOMAIN_SCAN_DEFAULT_MAX_PAGES);
        expect(resolveDomainScanMaxPages(0)).toBe(1);
        expect(resolveDomainScanMaxPages(50_000)).toBe(DOMAIN_SCAN_MAX_PAGES_CAP);
    });

    it('parseDomainScanMaxPagesParam returns undefined for empty input', () => {
        expect(parseDomainScanMaxPagesParam(null)).toBeUndefined();
        expect(parseDomainScanMaxPagesParam('')).toBeUndefined();
        expect(parseDomainScanMaxPagesParam('nope')).toBeUndefined();
    });

    it('parseDomainScanMaxPagesParam resolves valid numbers', () => {
        expect(parseDomainScanMaxPagesParam('250')).toBe(250);
        expect(parseDomainScanMaxPagesParam(99999)).toBe(DOMAIN_SCAN_MAX_PAGES_CAP);
    });

    it('buildDomainScanMaxPagesSelectOptions includes presets and cap', () => {
        const options = buildDomainScanMaxPagesSelectOptions('All (10000)');
        expect(options.map((o) => o.value)).toEqual([
            ...DOMAIN_SCAN_MAX_PAGES_PRESETS.map(String),
            String(DOMAIN_SCAN_MAX_PAGES_CAP),
        ]);
        expect(options.at(-1)?.label).toBe('All (10000)');
    });
});
