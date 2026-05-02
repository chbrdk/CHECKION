import { describe, it, expect } from 'vitest';
import { chunkArray } from '@/lib/array-chunk';

describe('chunkArray', () => {
    it('returns empty for empty input', () => {
        expect(chunkArray([], 10)).toEqual([]);
    });

    it('returns empty for non-positive size', () => {
        expect(chunkArray([1, 2], 0)).toEqual([]);
    });

    it('chunks by size', () => {
        expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });
});
