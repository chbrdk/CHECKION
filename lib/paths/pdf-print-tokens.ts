/**
 * Minimal print / PDF layout — white pages, uniform margins, optional small logo on cover.
 */

/** DIN A4 in PDF points */
export const PDF_PAGE_WIDTH_PT = 595.28;
export const PDF_PAGE_HEIGHT_PT = 841.89;

/** Page + content background */
export const PDF_PAGE_BACKGROUND = '#ffffff';

/** Legacy tokens — charts / KPI tints still reference these */
export const PDF_BRAND_COLOR = '#00ca55';
export const PDF_BRAND_TINT = '#f3f4f6';
export const PDF_INNER_BACKGROUND = '#ffffff';

export const PDF_RADIUS_BUTTON_PT = 8;

/** Uniform page margin */
export const PDF_PAGE_MARGIN_PT = 40;

/** Centered content column — text remains left-aligned inside */
export const PDF_CONTENT_COLUMN_MAX_WIDTH_PT = 420;

/** Extra inner padding on binding side (spread) */
export const PDF_BINDING_GUTTER_PT = 8;

/** Space reserved above footer line */
export const PDF_FOOTER_RESERVE_PT = 22;

/** Small msqdx logo on cover + footer */
export const PDF_MINIMAL_LOGO_WIDTH_PT = 52;
export const PDF_MINIMAL_LOGO_HEIGHT_PT = 12;
export const PDF_MINIMAL_LOGO_GAP_PT = 10;

/** Gap between footer page number and logo */
export const PDF_FOOTER_LOGO_GAP_PT = 6;

/** Even pages: page number then logo, outer left. Odd: logo then page number, outer right. */
export function pdfFooterAlignsOuterLeft(pageNumber: number): boolean {
    return pageNumber % 2 === 0;
}

/** @deprecated minimal layout — no app frame inset */
export const PDF_FRAME_INSET_PT = 0;
export const PDF_FRAME_BORDER_PT = 0;
export const PDF_CONTENT_PADDING_PT = PDF_PAGE_MARGIN_PT;

export type PdfSpreadSide = 'cover' | 'left' | 'right';

export const PDF_DOCUMENT_PAGE_LAYOUT = 'twoPageRight' as const;

export function pdfSpreadSideFromIndex(index: number): PdfSpreadSide {
    const pageNumber = index + 1;
    if (pageNumber === 1) return 'cover';
    return pageNumber % 2 === 0 ? 'left' : 'right';
}

/** Small logo top-left — cover page only */
export function pdfShowsPageLogoForSide(side: PdfSpreadSide): boolean {
    return side === 'cover';
}

/** @deprecated use pdfShowsPageLogoForSide */
export function pdfShowsCornerTabForSide(_side: PdfSpreadSide): boolean {
    return false;
}

/** Chapter intros start on gerade (even) page numbers — pad only when the next page would be odd. */
export function pdfNeedsSpreadPadBeforeChapter(currentPageCount: number): boolean {
    const nextPageNumber = currentPageCount + 1;
    return nextPageNumber % 2 !== 0;
}

/** 1-based page number of the chapter intro after optional spread pad. */
export function pdfChapterIntroPageNumber(currentPageCount: number): number {
    const pad = pdfNeedsSpreadPadBeforeChapter(currentPageCount) ? 1 : 0;
    return currentPageCount + pad + 1;
}

export function pdfContentMarginsForSide(side: PdfSpreadSide): {
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
} {
    const m = PDF_PAGE_MARGIN_PT;
    const bind = PDF_BINDING_GUTTER_PT;
    const logoBlock = pdfShowsPageLogoForSide(side)
        ? PDF_MINIMAL_LOGO_HEIGHT_PT + PDF_MINIMAL_LOGO_GAP_PT
        : 0;
    const bottom = m + PDF_FOOTER_RESERVE_PT;

    if (side === 'cover') {
        return {
            paddingTop: m + logoBlock,
            paddingBottom: bottom,
            paddingLeft: m,
            paddingRight: m,
        };
    }
    if (side === 'left') {
        return {
            paddingTop: m,
            paddingBottom: bottom,
            paddingLeft: m,
            paddingRight: m + bind,
        };
    }
    return {
        paddingTop: m,
        paddingBottom: bottom,
        paddingLeft: m + bind,
        paddingRight: m,
    };
}

export function pdfFooterInsetsForSide(side: PdfSpreadSide): {
    left: number;
    right: number;
    bottom: number;
} {
    const m = PDF_PAGE_MARGIN_PT;
    const bind = PDF_BINDING_GUTTER_PT;
    const bottom = PDF_PAGE_MARGIN_PT;

    if (side === 'cover') {
        return { left: m, right: m, bottom };
    }
    if (side === 'left') {
        return { left: m, right: m + bind, bottom };
    }
    return { left: m + bind, right: m, bottom };
}

/** @deprecated minimal layout — no decorative frame rect */
export type PdfFrameRect = { x: number; y: number; width: number; height: number };
export type PdfFrameRadii = {
    topLeft: number;
    topRight: number;
    bottomRight: number;
    bottomLeft: number;
};

export function pdfFrameRectForSide(side: PdfSpreadSide): PdfFrameRect {
    const m = pdfContentMarginsForSide(side);
    return {
        x: m.paddingLeft,
        y: m.paddingTop,
        width: PDF_PAGE_WIDTH_PT - m.paddingLeft - m.paddingRight,
        height: PDF_PAGE_HEIGHT_PT - m.paddingTop - m.paddingBottom,
    };
}

export function pdfFrameRadiiForSide(_side: PdfSpreadSide): PdfFrameRadii {
    return { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };
}
