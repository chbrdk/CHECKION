import { describe, it, expect } from 'vitest';
import { pdfSpreadSlots } from '@/lib/paths/pdf-spread-groups';

describe('pdfSpreadSlots', () => {
    it('places cover alone on the right (twoPageRight)', () => {
        expect(pdfSpreadSlots(1)).toEqual([[null, 1]]);
    });

    it('pairs even/odd pages after cover', () => {
        expect(pdfSpreadSlots(5)).toEqual([
            [null, 1],
            [2, 3],
            [4, 5],
        ]);
    });

    it('ends with lone left page when total is even after cover', () => {
        expect(pdfSpreadSlots(4)).toEqual([
            [null, 1],
            [2, 3],
            [4, null],
        ]);
    });
});
