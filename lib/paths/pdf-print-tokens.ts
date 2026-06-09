/**
 * Central print / PDF layout tokens — aligned with MsqdxAppLayout + MsqdxCornerBox.
 * Doppelseiten: linke Seite Rand oben/links/unten + Bindung rechts;
 * rechte Seite oben/rechts/unten bis Seitenrand, Bindung links.
 */

import { APP_LAYOUT_INNER_BORDER_WIDTH_PX } from '@/lib/constants';

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

/** Sichtbarer Brand-Rand — MsqdxAppLayout `borderWidth="thin"` (3px → 3pt print). */
export const PDF_FRAME_BORDER_PT = APP_LAYOUT_INNER_BORDER_WIDTH_PX;

/** Brand-Spalt zwischen Seitenkante und Innen-Panel (Layer, kein Border). */
export const PDF_FRAME_INSET_PT = 10;

/** Corner-Tab ragt über das Innen-Panel (oberer Brand-Layer). */
export const PDF_CORNER_TAB_OVERLAP_PT = 8;

/** Schmaler Spalt an der Bindung zwischen linker/rechter Seite */
export const PDF_BINDING_GUTTER_PT = 6;

/** Content padding inside frame */
export const PDF_CONTENT_PADDING_PT = 28;

/** @deprecated use PDF_BINDING_GUTTER_PT */
export const PDF_SPREAD_GUTTER_PT = PDF_BINDING_GUTTER_PT;

/** Base margin when no frame (legacy fallback) */
export const PDF_BASE_MARGIN_PT = 32;

/** MsqdxCornerBox padding on print preview tab (matches browser-tuned layout). */
export const PDF_CORNER_TAB_PADDING_TOP_PT = 6;
export const PDF_CORNER_TAB_PADDING_BOTTOM_PT = 0;
export const PDF_CORNER_TAB_PADDING_X_PT = 12;

/** Logo size inside the corner tab (matches PdfAppFrame / MsqdxLogoPdf). */
export const PDF_CORNER_TAB_LOGO_WIDTH_PT = 72;
export const PDF_CORNER_TAB_LOGO_HEIGHT_PT = 17;

/** Corner tab width = logo + horizontal padding (fit-content, like MsqdxCornerBox). */
export const PDF_CORNER_TAB_WIDTH_PT =
    PDF_CORNER_TAB_LOGO_WIDTH_PT + 2 * PDF_CORNER_TAB_PADDING_X_PT;

/**
 * Header strip before overlap — must fit logo + cutdown arcs (≥ 2× corner radius).
 * Tuned to match MsqdxCornerBox tab body in `/dev/pdf-print`.
 */
export const PDF_CORNER_TAB_HEIGHT_PT = 44;

/** Tab extends below header into inner panel (cutdown-b transition). */
export const PDF_CORNER_TAB_TOTAL_HEIGHT_PT = PDF_CORNER_TAB_HEIGHT_PT + PDF_CORNER_TAB_OVERLAP_PT;

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
 * Logo corner tab (MsqdxCornerBox, top-left cutdown) only on cover + left spread pages.
 * Odd pages (right / verso), except page 1, have no corner tab.
 */
export function pdfShowsCornerTabForSide(side: PdfSpreadSide): boolean {
    return side === 'cover' || side === 'left';
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
        width: PDF_PAGE_WIDTH_PT - bind,
        height,
    };
}

/** Corner radii — aligned with MsqdxAppLayout + sidebar (CHECKION default). */
export function pdfFrameRadiiForSide(side: PdfSpreadSide): PdfFrameRadii {
    const rBtn = PDF_RADIUS_BUTTON_PT;
    const r15 = PDF_RADIUS_1_5XL_PT;

    if (side === 'cover') {
        return { topLeft: 0, topRight: r15, bottomLeft: rBtn, bottomRight: r15 };
    }
    if (side === 'left') {
        return { topLeft: 0, topRight: 0, bottomLeft: rBtn, bottomRight: 0 };
    }
    return { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: r15 };
}

export function pdfContentMarginsForSide(side: PdfSpreadSide): {
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
} {
    const base = PDF_CONTENT_PADDING_PT;
    const inset = PDF_FRAME_INSET_PT;
    const bind = PDF_BINDING_GUTTER_PT;
    const tab = pdfShowsCornerTabForSide(side) ? PDF_CORNER_TAB_TOTAL_HEIGHT_PT : 0;
    const bottomExtra = 24;
    /** Brand gap is the inset layer only — no extra stroke offset (see checkion-pdf-print-layout.md). */
    const topChrome = inset + tab + base;

    if (side === 'cover') {
        return {
            paddingTop: topChrome,
            paddingBottom: inset + base + bottomExtra,
            paddingLeft: inset + base,
            paddingRight: inset + base,
        };
    }

    if (side === 'left') {
        return {
            paddingTop: topChrome,
            paddingBottom: inset + base + bottomExtra,
            paddingLeft: inset + base,
            paddingRight: base + bind,
        };
    }

    return {
        paddingTop: topChrome,
        paddingBottom: inset + base + bottomExtra,
        paddingLeft: base + bind,
        paddingRight: base,
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
    return { left: pad + bind, right: pad, bottom };
}
