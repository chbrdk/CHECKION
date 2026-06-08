import {
    PDF_CORNER_TAB_TOTAL_HEIGHT_PT,
    PDF_CORNER_TAB_WIDTH_PT,
    PDF_PAGE_HEIGHT_PT,
    PDF_PAGE_WIDTH_PT,
    PDF_RADIUS_BUTTON_PT,
    pdfFrameRadiiForSide,
    pdfFrameRectForSide,
    type PdfFrameRadii,
    type PdfSpreadSide,
} from '@/lib/paths/pdf-print-tokens';

export type RoundedRectRadii = PdfFrameRadii;

/** MsqdxCornerBox corner styles used on the logo tab (see MsqdxAppLayout). */
export type PdfCornerTabAnchor = 'left' | 'right';

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

/** Inner content panel (Layer 2 on brand page background). */
export function buildAppInnerFramePath(
    side: PdfSpreadSide = 'cover',
    pageW = PDF_PAGE_WIDTH_PT,
    pageH = PDF_PAGE_HEIGHT_PT
): string {
    const rect = pdfFrameRectForSide(side);
    const radii = pdfFrameRadiiForSide(side);
    return buildRoundedRectPath(rect.x, rect.y, rect.width, rect.height, radii);
}

export function pdfCornerTabAnchor(side: PdfSpreadSide): PdfCornerTabAnchor {
    return side === 'right' ? 'right' : 'left';
}

function cornerTabOrigin(side: PdfSpreadSide): { x: number; y: number } {
    const rect = pdfFrameRectForSide(side);
    const tabW = PDF_CORNER_TAB_WIDTH_PT;

    if (side === 'right') {
        return {
            x: rect.x + rect.width - tabW,
            y: rect.y,
        };
    }
    return {
        x: rect.x,
        y: rect.y,
    };
}

/**
 * MsqdxCornerBox SVG path — cutdown-a (top outer), cutdown-b (bottom inner), rounded opposite corner.
 * Matches `MsqdxAppLayout` logo strip: square logo corner, scooped transitions to inner panel.
 */
export function buildMsqdxCornerBoxPath(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    anchor: PdfCornerTabAnchor
): string {
    const R = Math.min(radius, w / 2, h / 2);

    if (anchor === 'left') {
        return [
            `M ${x} ${y}`,
            `L ${x + w - R} ${y}`,
            `A ${R} ${R} 0 0 1 ${x + w} ${y + R}`,
            `L ${x + w} ${y + h - R}`,
            `A ${R} ${R} 0 0 1 ${x + w - R} ${y + h}`,
            `L ${x + R} ${y + h}`,
            `A ${R} ${R} 0 0 1 ${x} ${y + h - R}`,
            'Z',
        ].join(' ');
    }

    return [
        `M ${x + w} ${y}`,
        `L ${x + R} ${y}`,
        `A ${R} ${R} 0 0 0 ${x} ${y + R}`,
        `L ${x} ${y + h - R}`,
        `A ${R} ${R} 0 0 0 ${x + R} ${y + h}`,
        `L ${x + w - R} ${y + h}`,
        `A ${R} ${R} 0 0 0 ${x + w} ${y + h - R}`,
        'Z',
    ].join(' ');
}

/** Brand corner tab (Layer 3) — MsqdxCornerBox geometry on the page. */
export function buildCornerTabPath(side: PdfSpreadSide = 'cover'): string {
    const { x, y } = cornerTabOrigin(side);
    const tabW = PDF_CORNER_TAB_WIDTH_PT;
    const tabH = PDF_CORNER_TAB_TOTAL_HEIGHT_PT;
    return buildMsqdxCornerBoxPath(x, y, tabW, tabH, PDF_RADIUS_BUTTON_PT, pdfCornerTabAnchor(side));
}

export function cornerTabLogoPosition(side: PdfSpreadSide): { top: number; left: number } {
    const { x, y } = cornerTabOrigin(side);
    return { top: y + 10, left: x + 10 };
}

export function cornerTabBox(side: PdfSpreadSide): { x: number; y: number; width: number; height: number } {
    const { x, y } = cornerTabOrigin(side);
    return {
        x,
        y,
        width: PDF_CORNER_TAB_WIDTH_PT,
        height: PDF_CORNER_TAB_TOTAL_HEIGHT_PT,
    };
}
