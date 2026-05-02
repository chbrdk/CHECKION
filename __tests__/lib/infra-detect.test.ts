import { describe, expect, it } from 'vitest';
import {
    inferInfraStackAndTracking,
    mergeTrackingFromThirdPartyHosts,
    normalizeHostname,
} from '@/lib/infra-detect';

describe('inferInfraStackAndTracking', () => {
    it('detects Next.js and GTM from script URLs', () => {
        const r = inferInfraStackAndTracking({
            hints: {
                generatorMeta: null,
                scriptSrcs: [
                    'https://www.googletagmanager.com/gtm.js?id=GTM-XXXX',
                    'https://example.com/_next/static/chunks/main.js',
                ],
                linkHrefs: [],
                inlineScriptFingerprint: '',
                hasNextData: true,
                hasWpJsonLink: false,
                hasWpContentScript: false,
            },
            serverHeader: 'Vercel',
            xPoweredBy: null,
        });
        expect(r.detectedPlatforms).toContain('Next.js');
        expect(r.detectedTracking.map((t) => t.id)).toContain('gtm');
        expect(r.hostingHints.server).toBe('Vercel');
    });

    it('detects WordPress + WooCommerce and Meta Pixel', () => {
        const r = inferInfraStackAndTracking({
            hints: {
                generatorMeta: 'WordPress 6.4',
                scriptSrcs: [
                    'https://example.com/wp-content/plugins/woocommerce/assets/js/frontend/add-to-cart.min.js',
                    'https://connect.facebook.net/en_US/fbevents.js',
                ],
                linkHrefs: ['https://example.com/wp-json/wp/v2/'],
                inlineScriptFingerprint: '',
                hasNextData: false,
                hasWpJsonLink: true,
                hasWpContentScript: true,
            },
            serverHeader: null,
            xPoweredBy: 'PHP/8.2',
        });
        expect(r.detectedPlatforms).toEqual(expect.arrayContaining(['WordPress', 'WooCommerce']));
        expect(r.detectedTracking.some((t) => t.id === 'fb-pixel')).toBe(true);
        expect(r.hostingHints.poweredBy).toBe('PHP/8.2');
    });

    it('detects Shopify and TikTok pixel', () => {
        const r = inferInfraStackAndTracking({
            hints: {
                generatorMeta: null,
                scriptSrcs: [
                    'https://cdn.shopify.com/s/files/1/2/3/t/4/assets/theme.js',
                    'https://analytics.tiktok.com/i18n/pixel/events.js',
                ],
                linkHrefs: [],
                inlineScriptFingerprint: '',
                hasNextData: false,
                hasWpJsonLink: false,
                hasWpContentScript: false,
            },
            serverHeader: null,
            xPoweredBy: null,
        });
        expect(r.detectedPlatforms).toContain('Shopify');
        expect(r.detectedTracking.some((t) => t.id === 'tiktok')).toBe(true);
    });

    it('returns empty lists when hints are absent', () => {
        const r = inferInfraStackAndTracking({
            hints: undefined,
            serverHeader: 'nginx',
            xPoweredBy: null,
        });
        expect(r.detectedPlatforms).toEqual([]);
        expect(r.detectedTracking).toEqual([]);
        expect(r.hostingHints.server).toBe('nginx');
    });

    it('dedupes tracking tools by id', () => {
        const r = inferInfraStackAndTracking({
            hints: {
                generatorMeta: null,
                scriptSrcs: [
                    'https://www.googletagmanager.com/gtm.js?id=GTM-A',
                    'https://www.googletagmanager.com/gtm.js?id=GTM-B',
                ],
                linkHrefs: [],
                inlineScriptFingerprint: '',
                hasNextData: false,
                hasWpJsonLink: false,
                hasWpContentScript: false,
            },
            serverHeader: null,
            xPoweredBy: null,
        });
        const gtm = r.detectedTracking.filter((t) => t.id === 'gtm');
        expect(gtm.length).toBe(1);
    });

    it('detects TYPO3 from asset paths and Storyblok from CDN', () => {
        const typo = inferInfraStackAndTracking({
            hints: {
                generatorMeta: null,
                scriptSrcs: ['https://example.com/typo3temp/assets/js/some.js'],
                linkHrefs: [],
                inlineScriptFingerprint: '',
                hasNextData: false,
                hasWpJsonLink: false,
                hasWpContentScript: false,
            },
            serverHeader: null,
            xPoweredBy: null,
        });
        expect(typo.detectedPlatforms).toContain('TYPO3');

        const sb = inferInfraStackAndTracking({
            hints: {
                generatorMeta: null,
                scriptSrcs: ['https://a.storyblok.com/f/12345/x.jpg/m/800x0'],
                linkHrefs: [],
                inlineScriptFingerprint: '',
                hasNextData: false,
                hasWpJsonLink: false,
                hasWpContentScript: false,
            },
            serverHeader: null,
            xPoweredBy: null,
        });
        expect(sb.detectedPlatforms).toContain('Storyblok');
    });

    it('detects a CMP from script URL (Consent Manager)', () => {
        const r = inferInfraStackAndTracking({
            hints: {
                generatorMeta: null,
                scriptSrcs: ['https://cdn.consentmanager.net/delivery/js/123/cmp.js'],
                linkHrefs: [],
                inlineScriptFingerprint: '',
                hasNextData: false,
                hasWpJsonLink: false,
                hasWpContentScript: false,
            },
            serverHeader: null,
            xPoweredBy: null,
        });
        expect(r.detectedTracking.some((t) => t.id === 'consentmanager')).toBe(true);
    });
});

describe('mergeTrackingFromThirdPartyHosts', () => {
    it('adds tools from request hostnames with (Netzwerk) label', () => {
        const r = mergeTrackingFromThirdPartyHosts([], [
            'stats.g.doubleclick.net',
            'sslwidget.criteo.com',
            'cdn.consentmanager.net',
        ]);
        expect(r.find((t) => t.id === 'doubleclick')?.name).toContain('Netzwerk');
        expect(r.some((t) => t.id === 'criteo')).toBe(true);
        expect(r.some((t) => t.id === 'consentmanager')).toBe(true);
    });

    it('does not duplicate when id already present from DOM', () => {
        const r = mergeTrackingFromThirdPartyHosts([{ id: 'gtm', name: 'Google Tag Manager' }], [
            'www.googletagmanager.com',
        ]);
        expect(r.filter((t) => t.id === 'gtm')).toHaveLength(1);
        expect(r[0].name).toBe('Google Tag Manager');
    });

    it('keeps DOM name when merging adds other ids', () => {
        const r = mergeTrackingFromThirdPartyHosts([{ id: 'gtm', name: 'Google Tag Manager' }], [
            'googleads.g.doubleclick.net',
        ]);
        expect(r.find((t) => t.id === 'gtm')?.name).toBe('Google Tag Manager');
        expect(r.find((t) => t.id === 'doubleclick')?.name).toContain('Netzwerk');
    });
});

describe('normalizeHostname', () => {
    it('lowercases and strips leading www.', () => {
        expect(normalizeHostname('WWW.Example.COM')).toBe('example.com');
    });
});
