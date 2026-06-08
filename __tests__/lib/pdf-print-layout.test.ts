import { describe, it, expect } from 'vitest';
import {
    buildAppInnerFramePath,
    buildCornerTabPath,
    buildRoundedRectPath,
} from '@/components/pdf/shared/pdf-frame-path';
import {
    pdfNeedsSpreadPadBeforeChapter,
    pdfSpreadSideFromIndex,
} from '@/lib/paths/pdf-print-tokens';

describe('pdf-frame-path', () => {
    it('builds closed rounded rect path', () => {
        const d = buildRoundedRectPath(0, 0, 100, 50, {
            topLeft: 8,
            topRight: 8,
            bottomRight: 8,
            bottomLeft: 8,
        });
        expect(d.startsWith('M')).toBe(true);
        expect(d.endsWith('Z')).toBe(true);
    });

    it('builds app inner frame with square top-left', () => {
        const d = buildAppInnerFramePath();
        expect(d).toContain('M');
        expect(d.length).toBeGreaterThan(40);
    });

    it('builds corner tab path', () => {
        const d = buildCornerTabPath();
        expect(d).toMatch(/^M /);
    });
});

describe('pdf-print-tokens spread helpers', () => {
    it('maps cover and spread sides', () => {
        expect(pdfSpreadSideFromIndex(0)).toBe('cover');
        expect(pdfSpreadSideFromIndex(1)).toBe('left');
        expect(pdfSpreadSideFromIndex(2)).toBe('right');
    });

    it('pads chapter when next page would be odd', () => {
        expect(pdfNeedsSpreadPadBeforeChapter(1)).toBe(false);
        expect(pdfNeedsSpreadPadBeforeChapter(4)).toBe(true);
    });
});
