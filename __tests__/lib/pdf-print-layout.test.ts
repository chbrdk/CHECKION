import { describe, it, expect } from 'vitest';
import {
    pdfNeedsSpreadPadBeforeChapter,
    pdfChapterIntroPageNumber,
    pdfSpreadSideFromIndex,
    pdfContentMarginsForSide,
    pdfFooterInsetsForSide,
    PDF_PAGE_WIDTH_PT,
    PDF_BINDING_GUTTER_PT,
    PDF_PAGE_MARGIN_PT,
    PDF_CONTENT_COLUMN_MAX_WIDTH_PT,
    PDF_MINIMAL_LOGO_HEIGHT_PT,
    PDF_MINIMAL_LOGO_GAP_PT,
    pdfShowsPageLogoForSide,
    pdfShowsCornerTabForSide,
    pdfFooterAlignsOuterLeft,
} from '@/lib/paths/pdf-print-tokens';

describe('pdf-print-tokens minimal layout', () => {
    it('maps cover and spread sides', () => {
        expect(pdfSpreadSideFromIndex(0)).toBe('cover');
        expect(pdfSpreadSideFromIndex(1)).toBe('left');
        expect(pdfSpreadSideFromIndex(2)).toBe('right');
    });

    it('pads chapter when next page would be odd', () => {
        expect(pdfNeedsSpreadPadBeforeChapter(1)).toBe(false);
        expect(pdfNeedsSpreadPadBeforeChapter(4)).toBe(true);
    });

    it('places chapter intro on even page numbers', () => {
        expect(pdfChapterIntroPageNumber(1)).toBe(2);
        expect(pdfChapterIntroPageNumber(1) % 2).toBe(0);
        expect(pdfChapterIntroPageNumber(4)).toBe(6);
        expect(pdfChapterIntroPageNumber(4) % 2).toBe(0);
        expect(pdfChapterIntroPageNumber(5)).toBe(6);
    });

    it('uses uniform margins with binding gutter on spreads', () => {
        const cover = pdfContentMarginsForSide('cover');
        const left = pdfContentMarginsForSide('left');
        const right = pdfContentMarginsForSide('right');

        expect(cover.paddingLeft).toBe(PDF_PAGE_MARGIN_PT);
        expect(left.paddingRight).toBe(PDF_PAGE_MARGIN_PT + PDF_BINDING_GUTTER_PT);
        expect(right.paddingLeft).toBe(PDF_PAGE_MARGIN_PT + PDF_BINDING_GUTTER_PT);
    });

    it('reserves logo block only on cover', () => {
        const cover = pdfContentMarginsForSide('cover');
        const left = pdfContentMarginsForSide('left');
        const logoBlock = PDF_MINIMAL_LOGO_HEIGHT_PT + PDF_MINIMAL_LOGO_GAP_PT;
        expect(cover.paddingTop).toBe(PDF_PAGE_MARGIN_PT + logoBlock);
        expect(left.paddingTop).toBe(PDF_PAGE_MARGIN_PT);
        expect(pdfShowsPageLogoForSide('cover')).toBe(true);
        expect(pdfShowsPageLogoForSide('left')).toBe(false);
        expect(pdfShowsCornerTabForSide('cover')).toBe(false);
    });

    it('footer insets follow page margins', () => {
        const cover = pdfFooterInsetsForSide('cover');
        expect(cover.left).toBe(PDF_PAGE_MARGIN_PT);
        expect(cover.right).toBe(PDF_PAGE_MARGIN_PT);
        expect(cover.bottom).toBe(PDF_PAGE_MARGIN_PT);
    });

    it('aligns footer cluster to outer left on even pages', () => {
        expect(pdfFooterAlignsOuterLeft(2)).toBe(true);
        expect(pdfFooterAlignsOuterLeft(3)).toBe(false);
    });

    it('page width is DIN A4', () => {
        expect(PDF_PAGE_WIDTH_PT).toBeCloseTo(595.28, 1);
    });

    it('defines centered content column narrower than printable area', () => {
        const printable = PDF_PAGE_WIDTH_PT - 2 * PDF_PAGE_MARGIN_PT;
        expect(PDF_CONTENT_COLUMN_MAX_WIDTH_PT).toBeLessThan(printable);
        expect(PDF_CONTENT_COLUMN_MAX_WIDTH_PT).toBeGreaterThan(360);
    });
});
