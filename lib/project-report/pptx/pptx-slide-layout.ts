/**
 * Slide geometry for LAYOUT_WIDE (13.33" × 7.5") — matches MSQDX_PPT-Master_27-05-26.pptx.
 */
export const PPTX_SLIDE = {
    width: 13.33,
    height: 7.5,
    marginX: 0.55,
    contentWidth: 12.2,
    titleY: 0.42,
    titleHeight: 0.8,
    leadY: 1.28,
    leadHeight: 0.55,
    contentTop: 1.35,
    contentBottom: 6.55,
    footerBarY: 6.88,
    footerBarHeight: 0.42,
    footerTextY: 6.95,
    footerTextHeight: 0.32,
    logoX: 0.45,
    logoY: 0.28,
    logoWidth: 2.0,
    /** MSQDX logotype aspect ratio (2424×981 px). */
    logoHeight: 0.81,
    slideNumberX: 12.45,
    slideNumberY: 6.98,
} as const;

export function pptxContentHeight(hasLead = false): number {
    const top = hasLead ? PPTX_SLIDE.leadY + PPTX_SLIDE.leadHeight + 0.12 : PPTX_SLIDE.contentTop;
    return PPTX_SLIDE.contentBottom - top;
}

export function pptxContentTop(hasLead = false): number {
    return hasLead ? PPTX_SLIDE.leadY + PPTX_SLIDE.leadHeight + 0.12 : PPTX_SLIDE.contentTop;
}

export function pptxColumnWidth(columns = 2): number {
    const gap = 0.35;
    return (PPTX_SLIDE.contentWidth - gap * (columns - 1)) / columns;
}
