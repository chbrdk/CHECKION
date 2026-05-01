import { describe, expect, it } from 'vitest';
import { ensureUrlWithScheme, normalizeScanUrl, toScanStartUrl } from '@/lib/url-normalize';

describe('toScanStartUrl', () => {
    it('returns null for empty input', () => {
        expect(toScanStartUrl('')).toBeNull();
        expect(toScanStartUrl('   ')).toBeNull();
    });

    it('prefixes https for bare hostnames', () => {
        expect(toScanStartUrl('example.com')).toBe('https://example.com');
        expect(toScanStartUrl('www.foo.bar')).toBe('https://www.foo.bar');
    });

    it('preserves existing schemes', () => {
        expect(toScanStartUrl('https://a.com/path')).toBe('https://a.com/path');
        expect(toScanStartUrl('http://b.org')).toBe('http://b.org');
    });

    it('trims whitespace', () => {
        expect(toScanStartUrl('  c.test  ')).toBe('https://c.test');
    });
});

describe('ensureUrlWithScheme', () => {
    it('returns empty string for empty input', () => {
        expect(ensureUrlWithScheme('')).toBe('');
        expect(ensureUrlWithScheme('  ')).toBe('');
    });

    it('matches toScanStartUrl for non-empty', () => {
        expect(ensureUrlWithScheme('url.de')).toBe('https://url.de');
        expect(ensureUrlWithScheme('www.url.de')).toBe('https://www.url.de');
    });
});

describe('normalizeScanUrl', () => {
    it('strips trailing slash on path', () => {
        expect(normalizeScanUrl('https://x.com/foo/')).toBe('https://x.com/foo');
    });
});
