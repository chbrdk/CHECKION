import { describe, it, expect } from 'vitest';
import {
    normalizeTagFilter,
    normalizeTagList,
    normalizeIndustry,
    parseTagsFromInput,
    rollupTagTiersToProjectTags,
    rollupThemesToProjectTags,
} from '@/lib/tag-utils';
import type { AggregatedPageClassification, PageClassification } from '@/lib/types';

describe('tag-utils', () => {
    it('normalizeTagFilter accepts word chars and hyphen', () => {
        expect(normalizeTagFilter('Retail-Q1')).toBe('retail-q1');
        expect(normalizeTagFilter('bad tag')).toBe(null);
    });

    it('normalizeIndustry trims and caps length', () => {
        expect(normalizeIndustry('  healthcare ')).toBe('healthcare');
        expect(normalizeIndustry('')).toBe(null);
    });

    it('normalizeTagList dedupes and caps', () => {
        expect(normalizeTagList(['a', 'A', 'b'])).toEqual(['a', 'b']);
    });

    it('parseTagsFromInput splits on comma and whitespace', () => {
        expect(parseTagsFromInput('foo, bar  baz')).toEqual(['foo', 'bar', 'baz']);
    });

    it('rollupThemesToProjectTags slugifies theme keys', () => {
        const pc: AggregatedPageClassification = {
            coverage: { totalPages: 2, pagesWithClassification: 2 },
            topThemes: [
                { tag: 'Foo Bar', themeTagKey: 'foo-bar', score: 1, pageCount: 1, maxTier: 3, avgTier: 3 },
                { tag: 'baz_qux', score: 1, pageCount: 1, maxTier: 3, avgTier: 3 },
            ],
            tierDistribution: {
                avgTagsPerPageByTier: { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 },
                pagesWithAtLeastOneTier5: 0,
                pagesDominatedByLowTiers: 0,
            },
            pageSamples: [],
        };
        expect(rollupThemesToProjectTags(pc, 10)).toEqual(['foo-bar', 'baz_qux']);
    });

    it('rollupThemesToProjectTags returns empty without themes', () => {
        expect(rollupThemesToProjectTags(undefined)).toEqual([]);
    });

    it('rollupTagTiersToProjectTags prefers higher tier and slugifies', () => {
        const pc: PageClassification = {
            tagTiers: [
                { tag: 'Foo Bar', tier: 3 },
                { tag: 'baz', tier: 4 },
            ],
        };
        expect(rollupTagTiersToProjectTags(pc, 10)).toEqual(['baz', 'foo-bar']);
    });

    it('rollupTagTiersToProjectTags returns empty without tiers', () => {
        expect(rollupTagTiersToProjectTags(undefined)).toEqual([]);
    });
});
