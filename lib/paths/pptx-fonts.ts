/**
 * PowerPoint font face names for CHECKION report export.
 * Aligned with msqdx-design-system `MSQDX_TYPOGRAPHY.fontFamily`.
 *
 * Note: PptxGenJS sets OOXML typeface names — fonts must be installed on the
 * machine opening the deck (or embedded manually in PowerPoint).
 */
export const PPTX_FONT_FACES = {
    /** Primary sans — titles, body, bullets (Noto Sans JP). */
    primary: 'Noto Sans JP',
    /** Mono — KPIs, footer, metadata (IBM Plex Mono). */
    mono: 'IBM Plex Mono',
} as const;

export type PptxFontFaces = typeof PPTX_FONT_FACES;
