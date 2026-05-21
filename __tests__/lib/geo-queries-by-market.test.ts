import { describe, it, expect } from 'vitest';
import {
    flattenGeoQueries,
    mergeGeoQueriesByMarket,
    normalizeGeoQueriesToByMarket,
} from '@/lib/geo-queries-by-market';

describe('geo-queries-by-market', () => {
    it('normalizes legacy string array to de-de', () => {
        const m = normalizeGeoQueriesToByMarket(['Frage A', 'Frage B']);
        expect(m['de-de']).toEqual(['Frage A', 'Frage B']);
    });

    it('flattens by-market without duplicates', () => {
        expect(
            flattenGeoQueries({
                'de-de': ['A'],
                'us-en': ['A', 'B'],
            })
        ).toEqual(['A', 'B']);
    });

    it('mergeGeoQueriesByMarket dedupes case-insensitively', () => {
        const merged = mergeGeoQueriesByMarket(['Alt'], { 'de-de': ['Neu', 'alt'] });
        expect(merged['de-de']).toEqual(['Alt', 'Neu']);
    });
});
