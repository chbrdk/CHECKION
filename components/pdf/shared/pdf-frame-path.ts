import {
    PDF_CORNER_CUT_PT,
    PDF_CORNER_TAB_HEIGHT_PT,
    PDF_CORNER_TAB_WIDTH_PT,
    PDF_FRAME_BORDER_PT,
    PDF_PAGE_HEIGHT_PT,
    PDF_PAGE_WIDTH_PT,
    PDF_RADIUS_BUTTON_PT,
    pdfFrameRadiiForSide,
    pdfFrameRectForSide,
    type PdfFrameRadii,
    type PdfSpreadSide,
} from '@/lib/paths/pdf-print-tokens';

export type RoundedRectRadii = PdfFrameRadii;

/** Clockwise rounded-rect path (SVG moveto/lineto/quadratic). */
export function buildRoundedRectPath(
    x: number,
    y: number,
    w: number,
    h: number,
    r: RoundedRectRadii
): string {
    const tl = Math.min(r.topLeft, w / 2, h / 2);
    const tr = Math.min(r.topRight, w / 2, h / 2);
    const br = Math.min(r.bottomRight, w / 2, h / 2);
    const bl = Math.min(r.bottomLeft, w / 2, h / 2);

    return [
        `M ${x + tl} ${y}`,
        `L ${x + w - tr} ${y}`,
        tr > 0 ? `Q ${x + w} ${y} ${x + w} ${y + tr}` : `L ${x + w} ${y}`,
        `L ${x + w} ${y + h - br}`,
        br > 0 ? `Q ${x + w} ${y + h} ${x + w - br} ${y + h}` : `L ${x + w} ${y + h}`,
        `L ${x + bl} ${y + h}`,
        bl > 0 ? `Q ${x} ${y + h} ${x} ${y + h - bl}` : `L ${x} ${y + h}`,
        `L ${x} ${y + tl}`,
        tl > 0 ? `Q ${x} ${y} ${x + tl} ${y}` : `L ${x} ${y}`,
        'Z',
    ].join(' ');
}

/** Inner app panel — spread-aware (asymmetric insets). */
export function buildAppInnerFramePath(
    side: PdfSpreadSide = 'cover',
    pageW = PDF_PAGE_WIDTH_PT,
    pageH = PDF_PAGE_HEIGHT_PT
): string {
    const rect = pdfFrameRectForSide(side);
    const radii = pdfFrameRadiiForSide(side);
    return buildRoundedRectPath(rect.x, rect.y, rect.width, rect.height, radii);
}

/**
 * Brand corner tab at the outer top corner (MsqdxCornerBox cutdown geometry).
 * Left/cover: top-left; right page: top-right (mirrored).
 */
export function buildCornerTabPath(
    side: PdfSpreadSide = 'cover',
    pageW = PDF_PAGE_WIDTH_PT
): string {
    const rect = pdfFrameRectForSide(side);
    const tabW = PDF_CORNER_TAB_WIDTH_PT;
    const tabH = PDF_CORNER_TAB_HEIGHT_PT;
    const cut = PDF_CORNER_CUT_PT;
    const rBr = PDF_RADIUS_BUTTON_PT;

    if (side === 'right') {
        const x = rect.x + rect.width - tabW;
        const y = rect.y;
        return [
            `M ${x + cut} ${y}`,
            `L ${x + tabW} ${y}`,
            `L ${x + tabW} ${y + tabH - cut}`,
            `Q ${x + tabW} ${y + tabH} ${x + tabW - cut} ${y + tabH}`,
            `L ${x + rBr} ${y + tabH}`,
            `Q ${x} ${y + tabH} ${x} ${y + tabH - rBr}`,
            `L ${x} ${y + cut}`,
            `Q ${x} ${y} ${x + cut} ${y}`,
            'Z',
        ].join(' ');
    }

    const x = rect.x;
    const y = rect.y;
    return [
        `M ${x} ${y}`,
        `L ${x + tabW - cut} ${y}`,
        `Q ${x + tabW} ${y} ${x + tabW} ${y + cut}`,
        `L ${x + tabW} ${y + tabH - rBr}`,
        `Q ${x + tabW} ${y + tabH} ${x + tabW - rBr} ${y + tabH}`,
        `L ${x + cut} ${y + tabH}`,
        `Q ${x} ${y + tabH} ${x} ${y + tabH - cut}`,
        'Z',
    ].join(' ');
}

export function cornerTabLogoPosition(side: PdfSpreadSide): { top: number; left: number } {
    const rect = pdfFrameRectForSide(side);
    const tabW = PDF_CORNER_TAB_WIDTH_PT;
    const top = rect.y + 8;
    if (side === 'right') {
        return { top, left: rect.x + rect.width - tabW + 8 };
    }
    return { top, left: rect.x + 8 };
}

export function buildAppFrameStrokePath(
    side: PdfSpreadSide = 'cover',
    pageW = PDF_PAGE_WIDTH_PT,
    pageH = PDF_PAGE_HEIGHT_PT
): string {
    const rect = pdfFrameRectForSide(side);
    const radii = pdfFrameRadiiForSide(side);
    const border = PDF_FRAME_BORDER_PT;
    const outer = buildAppInnerFramePath(side, pageW, pageH);
    const inner = buildRoundedRectPath(
        rect.x + border,
        rect.y + border,
        rect.width - border * 2,
        rect.height - border * 2,
        {
            topLeft: Math.max(radii.topLeft - border, 0),
            topRight: Math.max(radii.topRight - border, 0),
            bottomLeft: Math.max(radii.bottomLeft - border, 0),
            bottomRight: Math.max(radii.bottomRight - border, 0),
        }
    );
    return `${outer} ${inner}`;
}
