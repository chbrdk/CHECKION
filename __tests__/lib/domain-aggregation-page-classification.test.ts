/**
 * Domain rollup of pageClassification.tagTiers.
 */
import { describe, it, expect } from 'vitest';
import {
    aggregatePageClassification,
    normalizePageTopicTagKey,
} from '@/lib/domain-aggregation';
import { toStoredAggregated } from '@/lib/domain-summary';
import type { DomainSummaryResponse } from '@/lib/domain-summary';
import {
    DOMAIN_STORED_SUMMARY_PAGE_CLASSIFICATION_PAGE_SAMPLES_CAP,
    DOMAIN_STORED_SUMMARY_PAGE_CLASSIFICATION_TOP_THEMES_CAP,
} from '@/lib/constants';
import type { ScanResult, TagTier } from '@/lib/types';

function page(url: string, tagTiers: TagTier[]): ScanResult {
    return {
        id: 'x',
        url,
        timestamp: 't',
        standard: 'WCAG2AA',
        device: 'desktop',
        runners: ['axe'],
        issues: [],
        passes: [],
        stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
        durationMs: 1,
        score: 50,
        screenshot: '',
        performance: { ttfb: 0, fcp: 0, domLoad: 0, windowLoad: 0, lcp: 0 },
        eco: { co2: 0, grade: 'A', pageWeight: 0 },
        pageClassification: { tagTiers },
    };
}

describe('normalizePageTopicTagKey', () => {
    it('trims lowercases and collapses spaces', () => {
        expect(normalizePageTopicTagKey('  Foo   Bar  ')).toBe('foo bar');
    });
});

describe('aggregatePageClassification', () => {
    it('returns undefined for empty pages', () => {
        expect(aggregatePageClassification([])).toBeUndefined();
    });

    it('counts coverage when only some pages have tagTiers', () => {
        const pages: ScanResult[] = [
            page('https://a.test/', [{ tag: 'Alpha', tier: 5 }]),
            { ...page('https://a.test/b', []), pageClassification: undefined },
        ];
        const agg = aggregatePageClassification(pages);
        expect(agg).toBeDefined();
        expect(agg!.coverage.totalPages).toBe(2);
        expect(agg!.coverage.pagesWithClassification).toBe(1);
    });

    it('merges tags by normalized key and ranks tier-5 themes above damped boilerplate', () => {
        const pages: ScanResult[] = [
            page('https://a.test/', [
                { tag: 'Navigation', tier: 1 },
                { tag: 'Industry 4.0', tier: 5 },
            ]),
            page('https://a.test/p', [
                { tag: 'navigation', tier: 2 },
                { tag: 'Industry 4.0', tier: 5 },
            ]),
        ];
        const agg = aggregatePageClassification(pages)!;
        const nav = agg.topThemes.find((t) => t.tag.toLowerCase().includes('navigation'));
        const ind = agg.topThemes.find((t) => t.tag.includes('Industry'));
        expect(ind).toBeDefined();
        expect(nav).toBeDefined();
        expect((ind!.score ?? 0) > (nav!.score ?? 0)).toBe(true);
        expect(ind!.pageCount).toBe(2);
    });

    it('assigns page profiles and tier distribution denominators use totalPages', () => {
        const pages: ScanResult[] = [
            page('https://a.test/', [{ tag: 'Core', tier: 5 }, { tag: 'Core2', tier: 5 }]),
            page('https://a.test/u', [
                { tag: 'Nav', tier: 1 },
                { tag: 'Foot', tier: 1 },
                { tag: 'X', tier: 1 },
                { tag: 'Y', tier: 1 },
            ]),
        ];
        const agg = aggregatePageClassification(pages)!;
        expect(agg.tierDistribution.pagesWithAtLeastOneTier5).toBe(1);
        expect(agg.pageSamples).toHaveLength(2);
        const pillar = agg.pageSamples.find((s) => s.url.includes('a.test/') && !s.url.includes('/u'));
        expect(pillar?.profile).toBe('pillar');
    });
});

describe('toStoredAggregated pageClassification caps', () => {
    it('slices topThemes to stored cap', () => {
        const themes = Array.from({ length: 100 }, (_, i) => ({
            tag: `Theme-${i}`,
            score: 100 - i,
            pageCount: 1,
            maxTier: 5 as const,
            avgTier: 5,
        }));
        const aggregated = {
            issues: null,
            ux: null,
            seo: null,
            links: null,
            infra: null,
            generative: null,
            structure: null,
            eeatOnPage: null,
            performance: null,
            eco: null,
            pageClassification: {
                coverage: { totalPages: 10, pagesWithClassification: 10 },
                topThemes: themes,
                tierDistribution: {
                    avgTagsPerPageByTier: { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 },
                    pagesWithAtLeastOneTier5: 0,
                    pagesDominatedByLowTiers: 0,
                },
                pageSamples: Array.from({ length: 30 }, (_, i) => ({
                    url: `https://x.test/${i}`,
                    profile: 'mixed' as const,
                    tier5Count: 0,
                    lowTierCount: 0,
                })),
            },
        } as unknown as DomainSummaryResponse['aggregated'];

        const stored = toStoredAggregated(aggregated);
        expect(stored.pageClassification?.topThemes).toHaveLength(DOMAIN_STORED_SUMMARY_PAGE_CLASSIFICATION_TOP_THEMES_CAP);
        expect((stored.pageClassification?.pageSamples ?? []).length).toBeLessThanOrEqual(
            DOMAIN_STORED_SUMMARY_PAGE_CLASSIFICATION_PAGE_SAMPLES_CAP
        );
    });
});
