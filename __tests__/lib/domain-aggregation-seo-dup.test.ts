import { describe, expect, it } from 'vitest';
import { aggregateSeo } from '@/lib/domain-aggregation';
import type { ScanResult } from '@/lib/types';

function page(url: string, seo: NonNullable<ScanResult['seo']>, geo?: ScanResult['geo']): ScanResult {
    return {
        id: url,
        url,
        timestamp: 't',
        standard: 'WCAG2AA',
        device: 'desktop',
        runners: ['axe'],
        issues: [],
        passes: [],
        stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
        durationMs: 1,
        score: 90,
        screenshot: '',
        performance: { ttfb: 0, fcp: 0, domLoad: 0, windowLoad: 0, lcp: 0 },
        eco: { co2: 0, grade: 'A', pageWeight: 0 },
        seo,
        ...(geo ? { geo } : {}),
    };
}

describe('aggregateSeo duplicates & hreflang', () => {
    it('groups duplicate titles and meta descriptions', () => {
        const seo = { title: 'Hello World', metaDescription: 'Same meta desc long enough here', h1: 'H', canonical: null };
        const pages = [page('https://a.com/x', seo), page('https://a.com/y', { ...seo })];
        const agg = aggregateSeo(pages);
        expect(agg?.duplicateTitleGroups?.length).toBe(1);
        expect(agg?.duplicateTitleGroups?.[0]?.urls.length).toBe(2);
        expect(agg?.duplicateMetaDescriptionGroups?.length).toBe(1);
    });

    it('flags canonical mismatch vs page URL', () => {
        const p = page('https://example.com/page', {
            title: 'T',
            metaDescription: 'M'.repeat(25),
            h1: 'H',
            canonical: 'https://other.com/',
        });
        const agg = aggregateSeo([p]);
        expect(agg?.canonicalMismatchUrls).toContain('https://example.com/page');
    });

    it('detects x-default hreflang conflict across pages', () => {
        const baseSeo = { title: 'T', metaDescription: 'M'.repeat(25), h1: 'H', canonical: null as string | null };
        const g1: ScanResult['geo'] = {
            serverIp: null,
            location: null,
            cdn: { detected: false, provider: null },
            languages: { htmlLang: 'de', hreflangs: [{ lang: 'x-default', href: 'https://ex.com/en' }] },
        };
        const g2: ScanResult['geo'] = {
            serverIp: null,
            location: null,
            cdn: { detected: false, provider: null },
            languages: { htmlLang: 'fr', hreflangs: [{ lang: 'x-default', href: 'https://ex.com/de' }] },
        };
        const pages = [page('https://ex.com/de', baseSeo, g1), page('https://ex.com/fr', baseSeo, g2)];
        const agg = aggregateSeo(pages);
        expect(agg?.hreflangXDefaultConflict).toBe(true);
        expect((agg?.hreflangXDefaultDistinctTargets ?? []).length).toBeGreaterThan(1);
    });
});
