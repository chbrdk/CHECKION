import assert from 'node:assert';
import { describe, it } from 'node:test';
import { formatStructureLevelParts } from '@/lib/format-structure-level-parts';

describe('formatStructureLevelParts', () => {
    it('formats only non-zero levels in order', () => {
        assert.strictEqual(
            formatStructureLevelParts({ 1: 1, 2: 11, 4: 17 }),
            'H1:1 · H2:11 · H4:17',
        );
    });

    it('returns empty string when all zero', () => {
        assert.strictEqual(formatStructureLevelParts({}), '');
    });
});
