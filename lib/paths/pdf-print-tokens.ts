/**
 * Central print / PDF layout tokens — aligned with MsqdxAppLayout + MsqdxCornerBox.
 * @see components/AppShell.tsx
 * @see msqdx-design-system MsqdxAppLayout
 */

/** DIN A4 in PDF points */
export const PDF_PAGE_WIDTH_PT = 595.28;
export const PDF_PAGE_HEIGHT_PT = 841.89;

/** CHECKION default brand (matches --color-secondary-dx-green) */
export const PDF_BRAND_COLOR = '#00ca55';
export const PDF_BRAND_TINT = '#dff1e1';
export const PDF_INNER_BACKGROUND = '#f8f6f0';

/** Scaled from MSQDX_SPACING.borderRadius for print */
export const PDF_RADIUS_BUTTON_PT = 16;
export const PDF_RADIUS_1_5XL_PT = 28;
export const PDF_CORNER_CUT_PT = 12;

/** MsqdxAppLayout thin border */
export const PDF_FRAME_BORDER_PT = 3;

/** Brand margin around inner frame */
export const PDF_FRAME_INSET_PT = 18;

/** Content padding inside frame */
export const PDF_CONTENT_PADDING_PT = 28;

/** Extra inner margin on binding side (Doppelseite) */
export const PDF_SPREAD_GUTTER_PT = 14;

/** Base margin when no frame (legacy fallback) */
export const PDF_BASE_MARGIN_PT = 32;

/** Corner tab (logo badge) — MsqdxCornerBox header strip */
export const PDF_CORNER_TAB_WIDTH_PT = 128;
export const PDF_CORNER_TAB_HEIGHT_PT = 40;

export type PdfSpreadSide = 'cover' | 'left' | 'right';

/** 0-based page index → recto/verso for print spreads (page 1 = cover). */
export function pdfSpreadSideFromIndex(index: number): PdfSpreadSide {
    const pageNumber = index + 1;
    if (pageNumber === 1) return 'cover';
    return pageNumber % 2 === 0 ? 'left' : 'right';
}

/**
 * Chapter spreads use [left decorative, right title].
 * Left page must have an even page number → insert a blank when needed.
 */
export function pdfNeedsSpreadPadBeforeChapter(currentPageCount: number): boolean {
    const nextPageNumber = currentPageCount + 1;
    return nextPageNumber % 2 !== 0;
}

export function pdfContentMarginsForSide(side: PdfSpreadSide): {
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
} {
    const base = PDF_CONTENT_PADDING_PT;
    const frame = PDF_FRAME_INSET_PT + PDF_FRAME_BORDER_PT;
    const bottom = base + 24;

    if (side === 'cover') {
        return {
            paddingTop: frame + PDF_CORNER_TAB_HEIGHT_PT + base,
            paddingBottom: frame + bottom,
            paddingLeft: frame + base,
            paddingRight: frame + base,
        };
    }

    const gutter = PDF_SPREAD_GUTTER_PT;
    return {
        paddingTop: frame + PDF_CORNER_TAB_HEIGHT_PT + base,
        paddingBottom: frame + bottom,
        paddingLeft: frame + base + (side === 'right' ? gutter : 0),
        paddingRight: frame + base + (side === 'left' ? gutter : 0),
    };
}
