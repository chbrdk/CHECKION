import { describe, it, expect } from 'vitest';
import {
    pdfPtToCssLength,
    pdfPtToCssPx,
    pdfMarginsToCss,
    checkionDevPdfPrintPreviewUrl,
} from '@/lib/paths/pdf-print-preview';
import {
    PDF_CORNER_TAB_PADDING_TOP_PT,
    PDF_CORNER_TAB_PADDING_X_PT,
    pdfContentMarginsForSide,
} from '@/lib/paths/pdf-print-tokens';

describe('pdf-print-preview', () => {
    it('maps pdf points 1:1 to css px (no scale)', () => {
        expect(pdfPtToCssPx(100)).toBe(100);
        expect(pdfPtToCssPx(18)).toBe(18);
    });

    it('builds explicit css lengths for MUI sx padding (avoids theme spacing)', () => {
        expect(pdfPtToCssLength(PDF_CORNER_TAB_PADDING_TOP_PT)).toBe('6px');
        expect(pdfPtToCssLength(PDF_CORNER_TAB_PADDING_X_PT)).toBe('12px');
    });

    it('maps asymmetric margins for spread pages', () => {
        const css = pdfMarginsToCss(pdfContentMarginsForSide('left'));
        const right = pdfMarginsToCss(pdfContentMarginsForSide('right'));
        expect(css.paddingLeft).toBeGreaterThan(right.paddingLeft);
        expect(right.paddingRight).toBeLessThan(css.paddingLeft);
    });

    it('builds dev preview url with checkion port', () => {
        expect(checkionDevPdfPrintPreviewUrl()).toBe('http://localhost:3333/dev/pdf-print');
        expect(checkionDevPdfPrintPreviewUrl('/checkion')).toBe('http://localhost:3333/checkion/dev/pdf-print');
    });
});
