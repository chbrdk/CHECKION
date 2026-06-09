import { describe, it, expect } from 'vitest';
import {
    pdfPtToCssLength,
    pdfPtToCssPx,
    pdfMarginsToCss,
    checkionDevPdfPrintPreviewUrl,
} from '@/lib/paths/pdf-print-preview';
import {
    PDF_PAGE_MARGIN_PT,
    pdfContentMarginsForSide,
} from '@/lib/paths/pdf-print-tokens';

describe('pdf-print-preview', () => {
    it('maps pdf points 1:1 to css px (no scale)', () => {
        expect(pdfPtToCssPx(100)).toBe(100);
        expect(pdfPtToCssPx(18)).toBe(18);
    });

    it('builds explicit css lengths for MUI sx padding', () => {
        expect(pdfPtToCssLength(PDF_PAGE_MARGIN_PT)).toBe('40px');
    });

    it('maps asymmetric margins for spread pages', () => {
        const css = pdfMarginsToCss(pdfContentMarginsForSide('left'));
        const right = pdfMarginsToCss(pdfContentMarginsForSide('right'));
        expect(css.paddingRight).toBeGreaterThan(right.paddingRight);
        expect(right.paddingLeft).toBeGreaterThan(css.paddingLeft);
    });

    it('builds dev preview url with checkion port', () => {
        expect(checkionDevPdfPrintPreviewUrl()).toBe('http://localhost:3333/dev/pdf-print');
        expect(checkionDevPdfPrintPreviewUrl('/checkion')).toBe('http://localhost:3333/checkion/dev/pdf-print');
    });
});
