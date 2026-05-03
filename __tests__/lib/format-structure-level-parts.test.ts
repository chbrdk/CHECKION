import { describe, expect, it } from 'vitest';
import { formatStructureLevelParts } from '@/lib/format-structure-level-parts';

describe('formatStructureLevelParts', () => {
    it('formats only non-zero levels in order', () => {
        expect(formatStructureLevelParts({ 1: 1, 2: 11, 4: 17 })).toBe(
            'H1:1 · H2:11 · H4:17',
        );
    });

    it('returns empty string when all zero', () => {
        expect(formatStructureLevelParts({})).toBe('');
    });
});
