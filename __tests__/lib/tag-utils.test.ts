import { describe, it, expect } from 'vitest';
import {
    normalizeTagFilter,
    normalizeTagList,
    normalizeIndustry,
    parseTagsFromInput,
} from '@/lib/tag-utils';

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
});
