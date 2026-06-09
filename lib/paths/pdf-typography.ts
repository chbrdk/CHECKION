/**
 * Print typography — shared by PDF export and `/dev/pdf-print` (react-pdf PDFViewer).
 * Helvetica standard fonts: light = regular weight + muted color; bold = fontWeight bold.
 */

/** Tighter than browser defaults — unitless multipliers for react-pdf (× fontSize at layout). */
export const PDF_TYPE_LINE_HEIGHT = {
    /** Display titles, chapter headlines */
    tight: 1.12,
    /** Labels, recommendations, tables */
    snug: 1.28,
    /** Body copy, lead paragraphs */
    body: 1.32,
} as const;

export type PdfTypeLineHeight = (typeof PDF_TYPE_LINE_HEIGHT)[keyof typeof PDF_TYPE_LINE_HEIGHT];

/** react-pdf / Helvetica — no separate Thin/Light face; use weight + color for rhythm */
export const PDF_TYPE_WEIGHT = {
    light: 'normal' as const,
    regular: 'normal' as const,
    bold: 'bold' as const,
};

export type PdfTypeWeight = (typeof PDF_TYPE_WEIGHT)[keyof typeof PDF_TYPE_WEIGHT];

/** MUI preview mirror (400 ≈ light/regular, 700 ≈ bold) */
export const PDF_PREVIEW_FONT_WEIGHT = {
    light: 300,
    regular: 400,
    bold: 700,
} as const;
