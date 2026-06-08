import { describe, it, expect } from 'vitest';
import {
    buildAppInnerFramePath,
    buildCornerTabPath,
    buildRoundedRectPath,
} from '@/components/pdf/shared/pdf-frame-path';
import {
    pdfNeedsSpreadPadBeforeChapter,
    pdfSpreadSideFromIndex,
    pdfFrameRectForSide,
    pdfContentMarginsForSide,
    PDF_PAGE_WIDTH_PT,
    PDF_BINDING_GUTTER_PT,
    PDF_FRAME_INSET_PT,
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

    it('builds spread-aware inner frames', () => {
        expect(buildAppInnerFramePath('left')).toContain('M');
        expect(buildAppInnerFramePath('right')).toContain('M');
    });

    it('builds corner tab for left and right', () => {
        expect(buildCornerTabPath('left')).toMatch(/^M /);
        expect(buildCornerTabPath('right')).toMatch(/^M /);
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

    it('left page frame extends to binding edge (no right inset)', () => {
        const rect = pdfFrameRectForSide('left');
        expect(rect.x).toBe(PDF_FRAME_INSET_PT);
        expect(rect.x + rect.width).toBeCloseTo(PDF_PAGE_WIDTH_PT - PDF_BINDING_GUTTER_PT, 0);
    });

    it('right page frame extends to binding edge (no left inset)', () => {
        const rect = pdfFrameRectForSide('right');
        expect(rect.x).toBe(PDF_BINDING_GUTTER_PT);
        expect(rect.x + rect.width).toBeCloseTo(PDF_PAGE_WIDTH_PT - PDF_FRAME_INSET_PT, 0);
    });

    it('left page content has no outer margin on the right', () => {
        const m = pdfContentMarginsForSide('left');
        const right = pdfContentMarginsForSide('right');
        expect(m.paddingRight).toBeLessThan(right.paddingRight);
        expect(m.paddingLeft).toBeGreaterThan(right.paddingLeft);
    });
});
