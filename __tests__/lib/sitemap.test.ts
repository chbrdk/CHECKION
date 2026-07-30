import { describe, expect, it, vi, afterEach } from 'vitest';
import {
    isSameSiteOrigin,
    siteHostKey,
    fetchSitemapUrls,
    getSitemapUrlsFromRobots,
    discoverSitemapPageUrls,
} from '@/lib/sitemap';

describe('siteHostKey / isSameSiteOrigin', () => {
    it('strips www for host key', () => {
        expect(siteHostKey('www.vkb.de')).toBe('vkb.de');
        expect(siteHostKey('vkb.de')).toBe('vkb.de');
        expect(siteHostKey('WWW.Example.COM')).toBe('example.com');
    });

    it('treats apex and www as same site', () => {
        expect(isSameSiteOrigin('https://www.vkb.de/page', 'https://vkb.de')).toBe(true);
        expect(isSameSiteOrigin('https://vkb.de/', 'https://www.vkb.de')).toBe(true);
        expect(isSameSiteOrigin('https://www.vkb.de/a', 'https://www.vkb.de')).toBe(true);
    });

    it('rejects other hosts and schemes', () => {
        expect(isSameSiteOrigin('https://other.de/', 'https://vkb.de')).toBe(false);
        expect(isSameSiteOrigin('http://vkb.de/', 'https://vkb.de')).toBe(false);
    });
});

describe('fetchSitemapUrls www/apex', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('keeps www sitemap locs when scan origin is apex (vkb.de case)', async () => {
        const xml = `<?xml version="1.0"?><urlset>
          <url><loc>https://www.vkb.de/</loc></url>
          <url><loc>https://www.vkb.de/zielgruppen/familien.html</loc></url>
          <url><loc>https://evil.example/x</loc></url>
        </urlset>`;
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                text: async () => xml,
            }))
        );

        const urls = await fetchSitemapUrls('https://www.vkb.de/sitemap.xml', 'https://vkb.de', 100);
        expect(urls).toHaveLength(2);
        expect(urls[0]).toContain('www.vkb.de');
        expect(urls.some((u) => u.includes('evil'))).toBe(false);
    });
});

describe('getSitemapUrlsFromRobots', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('collects all Sitemap: lines', async () => {
        const robots = `User-agent: *
Disallow: /admin
Sitemap: https://www.vkb.de/sitemap.xml
Sitemap: https://www.vkb.de/ad-sitemap.xml
`;
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => {
                if (String(url).includes('robots.txt')) {
                    return { ok: true, text: async () => robots };
                }
                return { ok: false, text: async () => '' };
            })
        );

        const urls = await getSitemapUrlsFromRobots('https://vkb.de');
        expect(urls).toEqual([
            'https://www.vkb.de/sitemap.xml',
            'https://www.vkb.de/ad-sitemap.xml',
        ]);
    });
});

describe('discoverSitemapPageUrls', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('merges URLs from multiple robots sitemaps under apex origin', async () => {
        const robots = `Sitemap: https://www.vkb.de/sitemap.xml
Sitemap: https://www.vkb.de/ad-sitemap.xml
`;
        const main = `<?xml version="1.0"?><urlset>
          <url><loc>https://www.vkb.de/</loc></url>
          <url><loc>https://www.vkb.de/a.html</loc></url>
        </urlset>`;
        const ad = `<?xml version="1.0"?><urlset>
          <url><loc>https://www.vkb.de/ad/x.html</loc></url>
        </urlset>`;

        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => {
                const u = String(url);
                if (u.includes('robots.txt')) return { ok: true, text: async () => robots };
                if (u.includes('ad-sitemap')) return { ok: true, text: async () => ad };
                if (u.includes('sitemap.xml')) return { ok: true, text: async () => main };
                return { ok: false, text: async () => '' };
            })
        );

        const urls = await discoverSitemapPageUrls('https://vkb.de', 100);
        expect(urls).toHaveLength(3);
        expect(urls.map((u) => new URL(u).pathname).sort()).toEqual(['/', '/a.html', '/ad/x.html']);
    });
});
