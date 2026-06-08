/**
 * Central print / PDF layout tokens — aligned with MsqdxAppLayout + MsqdxCornerBox.
 * Doppelseiten: linke Seite Rand oben/links/unten, rechte Seite oben/rechts/unten.
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

/** Außenrand (nur auf der äußeren Seite + oben/unten) */
export const PDF_FRAME_INSET_PT = 18;

/** Schmaler Spalt an der Bindung zwischen linker/rechter Seite */
export const PDF_BINDING_GUTTER_PT = 6;

/** Content padding inside frame */
export const PDF_CONTENT_PADDING_PT = 28;

/** @deprecated use PDF_BINDING_GUTTER_PT */
export const PDF_SPREAD_GUTTER_PT = PDF_BINDING_GUTTER_PT;

/** Base margin when no frame (legacy fallback) */
export const PDF_BASE_MARGIN_PT = 32;

/** Corner tab (logo badge) — MsqdxCornerBox header strip */
export const PDF_CORNER_TAB_WIDTH_PT = 128;
export const PDF_CORNER_TAB_HEIGHT_PT = 40;

export type PdfSpreadSide = 'cover' | 'left' | 'right';

export type PdfFrameRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type PdfFrameRadii = {
    topLeft: number;
    topRight: number;
    bottomRight: number;
    bottomLeft: number;
};

/** react-pdf Document pageLayout for cover + facing spreads in viewers. */
export const PDF_DOCUMENT_PAGE_LAYOUT = 'twoPageRight' as const;

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

/** Inner panel bounds — binding edge flush, outer edge inset. */
export function pdfFrameRectForSide(side: PdfSpreadSide): PdfFrameRect {
    const inset = PDF_FRAME_INSET_PT;
    const bind = PDF_BINDING_GUTTER_PT;
    const y = inset;
    const height = PDF_PAGE_HEIGHT_PT - inset * 2;

    if (side === 'cover') {
        return {
            x: inset,
            y,
            width: PDF_PAGE_WIDTH_PT - inset * 2,
            height,
        };
    }

    if (side === 'left') {
        return {
            x: inset,
            y,
            width: PDF_PAGE_WIDTH_PT - inset - bind,
            height,
        };
    }

    return {
        x: bind,
        y,
        width: PDF_PAGE_WIDTH_PT - inset - bind,
        height,
    };
}

/** Corner radii: rounded on outer corners, square at binding. */
export function pdfFrameRadiiForSide(side: PdfSpreadSide): PdfFrameRadii {
    const rBtn = PDF_RADIUS_BUTTON_PT;
    const r15 = PDF_RADIUS_1_5XL_PT;

    if (side === 'cover') {
        return { topLeft: 0, topRight: rBtn, bottomLeft: r15, bottomRight: r15 };
    }
    if (side === 'left') {
        return { topLeft: rBtn, topRight: 0, bottomLeft: r15, bottomRight: 0 };
    }
    return { topLeft: 0, topRight: rBtn, bottomLeft: 0, bottomRight: r15 };
}

export function pdfContentMarginsForSide(side: PdfSpreadSide): {
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
} {
    const base = PDF_CONTENT_PADDING_PT;
    const border = PDF_FRAME_BORDER_PT;
    const inset = PDF_FRAME_INSET_PT;
    const bind = PDF_BINDING_GUTTER_PT;
    const tab = PDF_CORNER_TAB_HEIGHT_PT;
    const bottomExtra = 24;

    if (side === 'cover') {
        const frame = inset + border;
        return {
            paddingTop: frame + tab + base,
            paddingBottom: frame + base + bottomExtra,
            paddingLeft: frame + base,
            paddingRight: frame + base,
        };
    }

    if (side === 'left') {
        return {
            paddingTop: inset + border + tab + base,
            paddingBottom: inset + border + base + bottomExtra,
            paddingLeft: inset + border + base,
            paddingRight: border + base + bind,
        };
    }

    return {
        paddingTop: inset + border + tab + base,
        paddingBottom: inset + border + base + bottomExtra,
        paddingLeft: border + base + bind,
        paddingRight: inset + border + base,
    };
}

export function pdfFooterInsetsForSide(side: PdfSpreadSide): {
    left: number;
    right: number;
    bottom: number;
} {
    const inset = PDF_FRAME_INSET_PT;
    const bind = PDF_BINDING_GUTTER_PT;
    const pad = PDF_CONTENT_PADDING_PT;
    const bottom = PDF_FRAME_INSET_PT + 12;

    if (side === 'cover') {
        return { left: inset + pad, right: inset + pad, bottom };
    }
    if (side === 'left') {
        return { left: inset + pad, right: pad + bind, bottom };
    }
    return { left: pad + bind, right: inset + pad, bottom };
}
