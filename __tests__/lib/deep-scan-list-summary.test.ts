import { describe, expect, it } from 'vitest';
import { formatDeepScanInfraListLines } from '@/lib/deep-scan-list-summary';

describe('formatDeepScanInfraListLines', () => {
    it('returns null lines for non-object input', () => {
        expect(formatDeepScanInfraListLines(null)).toEqual({
            platformsLine: null,
            infraLine: null,
            privacyLine: null,
        });
        expect(formatDeepScanInfraListLines(undefined)).toEqual({
            platformsLine: null,
            infraLine: null,
            privacyLine: null,
        });
    });

    it('builds platform line from geo.sample.detectedPlatforms', () => {
        const out = formatDeepScanInfraListLines({
            geo: {
                pageCount: 1,
                sample: {
                    serverIp: null,
                    location: null,
                    cdn: { detected: false, provider: null },
                    languages: { htmlLang: null, hreflangs: [] },
                    detectedPlatforms: ['WordPress', 'WooCommerce'],
                    detectedTracking: [],
                    hostingHints: { server: null, poweredBy: null },
                },
            },
            privacy: {
                withPolicy: 0,
                withCookieBanner: 0,
                withTerms: 0,
                totalPages: 10,
                urlsWithPolicy: [],
                urlsWithCookieBanner: [],
                urlsWithTerms: [],
            },
            security: {
                withCsp: 0,
                withXFrame: 0,
                withPermissionsPolicy: 0,
                withCoop: 0,
                totalPages: 10,
                urlsWithCsp: [],
                urlsWithXFrame: [],
                urlsWithPermissionsPolicy: [],
                urlsWithCoop: [],
            },
            technical: null,
            technicalCounts: null,
        });
        expect(out.platformsLine).toBe('WordPress, WooCommerce');
    });

    it('combines CDN, hosting, and CSP into infra line', () => {
        const out = formatDeepScanInfraListLines({
            geo: {
                pageCount: 1,
                sample: {
                    serverIp: null,
                    location: null,
                    cdn: { detected: true, provider: 'Cloudflare' },
                    languages: { htmlLang: null, hreflangs: [] },
                    detectedPlatforms: [],
                    detectedTracking: [],
                    hostingHints: { server: 'nginx', poweredBy: 'PHP/8.2' },
                },
            },
            privacy: {
                withPolicy: 0,
                withCookieBanner: 0,
                withTerms: 0,
                totalPages: 10,
                urlsWithPolicy: [],
                urlsWithCookieBanner: [],
                urlsWithTerms: [],
            },
            security: {
                withCsp: 4,
                withXFrame: 0,
                withPermissionsPolicy: 0,
                withCoop: 0,
                totalPages: 10,
                urlsWithCsp: [],
                urlsWithXFrame: [],
                urlsWithPermissionsPolicy: [],
                urlsWithCoop: [],
            },
            technical: null,
            technicalCounts: null,
        });
        expect(out.infraLine).toBe('Cloudflare · nginx · PHP/8.2 · CSP 4/10');
    });

    it('formats privacy ratios and consent hints', () => {
        const out = formatDeepScanInfraListLines({
            geo: { pageCount: 0, sample: null },
            privacy: {
                withPolicy: 3,
                withCookieBanner: 2,
                withTerms: 1,
                totalPages: 10,
                urlsWithPolicy: [],
                urlsWithCookieBanner: [],
                urlsWithTerms: [],
                consent: { pagesWithTcfApi: 2, pagesWithCmpHint: 5, earlyScriptHostCounts: [] },
            },
            security: {
                withCsp: 0,
                withXFrame: 0,
                withPermissionsPolicy: 0,
                withCoop: 0,
                totalPages: 0,
                urlsWithCsp: [],
                urlsWithXFrame: [],
                urlsWithPermissionsPolicy: [],
                urlsWithCoop: [],
            },
            technical: null,
            technicalCounts: null,
        });
        expect(out.privacyLine).toBe('3/10 · 2/10 · 1/10 · TCF 2 · CMP 5');
    });
});
