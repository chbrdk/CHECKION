import { describe, expect, it } from 'vitest';
import { collectDetectedPlatforms } from '@/lib/infra-platform-detect';

const base = {
    generatorMeta: null as string | null,
    hasNextData: false,
    hasWpJsonLink: false,
    hasWpContentScript: false,
    bundleLower: '',
    haystackLower: '',
};

describe('collectDetectedPlatforms', () => {
    it('detects headless CMS from CDN URLs', () => {
        const r = collectDetectedPlatforms({
            ...base,
            bundleLower:
                'https://images.ctfassets.net/xxx/foo.jpg https://cdn.sanity.io/images/yyy/bar.webp https://a.storyblok.com/f/1/x.jpg',
            haystackLower: '',
        });
        expect(r).toEqual(expect.arrayContaining(['Contentful', 'Sanity', 'Storyblok']));
    });

    it('detects Adobe AEM and Sitecore-style assets', () => {
        const r = collectDetectedPlatforms({
            ...base,
            bundleLower:
                'https://www.example.com/etc.clientlibs/wcm/foundation/clientlibs/main.min.js ' +
                'https://sitecore.example/-/media/hero.ashx',
            haystackLower: '',
        });
        expect(r).toContain('Adobe Experience Manager');
        expect(r).toContain('Sitecore');
    });

    it('detects Bloomreach and microCMS-style CDNs', () => {
        const r = collectDetectedPlatforms({
            ...base,
            bundleLower:
                'https://cdn.bloomreach.com/scripts/foo.js https://images.microcms.io/assets/abc.jpg',
            haystackLower: '',
        });
        expect(r).toContain('Bloomreach (brXM / Engagement)');
        expect(r).toContain('microCMS');
    });

    it('detects Liferay and Optimizely CMS asset paths', () => {
        const r = collectDetectedPlatforms({
            ...base,
            bundleLower:
                'https://example.com/o/headless-delivery/v1/ https://world.optimizely.com/episerver/cms',
            haystackLower: '',
        });
        expect(r).toContain('Liferay');
        expect(r).toContain('Optimizely CMS (Episerver)');
    });

    it('detects enterprise e-commerce signals', () => {
        const r = collectDetectedPlatforms({
            ...base,
            bundleLower: 'https://cdn.shopify.com/s/files/1/2/3.js https://edge.dis.commercecloud.salesforce.com/dw/xxx',
            haystackLower: '',
        });
        expect(r).toContain('Shopify');
        expect(r).toContain('Salesforce Commerce Cloud');
    });

    it('detects Storyblok from image CDN URL alone (typical headless)', () => {
        const r = collectDetectedPlatforms({
            ...base,
            bundleLower: 'https://a.storyblok.com/f/12345/800x600/image.jpg',
            haystackLower: '',
        });
        expect(r).toContain('Storyblok');
    });

    it('deduplicates by platform name', () => {
        const r = collectDetectedPlatforms({
            ...base,
            bundleLower: 'https://cdn.shopify.com/ https://cdn.shopify.com/other',
            haystackLower: '',
        });
        expect(r.filter((x) => x === 'Shopify').length).toBe(1);
    });
});
