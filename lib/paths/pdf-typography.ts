/**
 * Print typography — shared by PDF export and `/dev/pdf-print` (react-pdf PDFViewer).
 * Helvetica standard fonts: light = regular weight + muted color; bold = fontWeight bold.
 */

/** Tighter than browser defaults — tuned for A4 print density */
export const PDF_TYPE_LINE_HEIGHT = {
    /** Display titles, chapter headlines */
    tight: 1.12,
    /** Labels, recommendations, tables */
    snug: 1.28,
    /** Body copy, lead paragraphs */
    body: 1.32,
} as const;

export type PdfTypeLineHeight = (typeof PDF_TYPE_LINE_HEIGHT)[keyof typeof PDF_TYPE_LINE_HEIGHT];

export type PdfTypeLineHeightToken = keyof typeof PDF_TYPE_LINE_HEIGHT;

/**
 * Absolute line height in pt for @react-pdf/renderer.
 * textkit treats `lineHeight` as a fixed line box — unitless ratios must be converted and
 * small body sizes need a higher effective ratio so wrapped lines do not overlap glyphs.
 */
export function pdfLineHeightPt(
    fontSize: number,
    token: PdfTypeLineHeightToken = 'body',
): number {
    const ratio = PDF_TYPE_LINE_HEIGHT[token];
    const minRatio = fontSize <= 11 ? 1.4 : ratio;
    const effectiveRatio = fontSize <= 11 ? Math.max(ratio, minRatio) : ratio;
    return Math.round(fontSize * effectiveRatio * 10) / 10;
}

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
