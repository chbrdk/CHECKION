import {
    PDF_CORNER_TAB_PADDING_TOP_PT,
    PDF_CORNER_TAB_PADDING_X_PT,
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

export type PdfCornerStyle = 'square' | 'rounded' | 'cutdown-a' | 'cutdown-b';

type CornerKey = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';

/**
 * Print corner tab — transitions face the inner panel (cutdown) vs outer page edge (rounded).
 * topRight is convex (rounded); bottomRight scoops into the panel (cutdown-a).
 */
export function pdfCornerTabStyles(anchor: PdfCornerTabAnchor): Record<CornerKey, PdfCornerStyle> {
    if (anchor === 'left') {
        return {
            topLeft: 'square',
            topRight: 'rounded',
            bottomRight: 'cutdown-a',
            bottomLeft: 'cutdown-b',
        };
    }
    return {
        topLeft: 'cutdown-a',
        topRight: 'square',
        bottomRight: 'cutdown-b',
        bottomLeft: 'rounded',
    };
}

/** SVG arc sweep: convex rounded = 1, concave cutdown = 0 (react-pdf SVG coords). */
function arcSweep(style: PdfCornerStyle): 0 | 1 {
    return style === 'rounded' ? 1 : 0;
}

function arc(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    R: number,
    style: PdfCornerStyle
): string {
    return `A ${R} ${R} 0 0 ${arcSweep(style)} ${x2} ${y2}`;
}

/**
 * Clockwise outline for one corner tab — corner styles per {@link pdfCornerTabStyles}.
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
    const c = pdfCornerTabStyles(anchor);

    if (anchor === 'left') {
        return [
            `M ${x} ${y}`,
            `L ${x + w - R} ${y}`,
            arc(x + w - R, y, x + w, y + R, R, c.topRight),
            `L ${x + w} ${y + h - R}`,
            arc(x + w, y + h - R, x + w - R, y + h, R, c.bottomRight),
            `L ${x + R} ${y + h}`,
            arc(x + R, y + h, x, y + h - R, R, c.bottomLeft),
            `L ${x} ${y}`,
            'Z',
        ].join(' ');
    }

    return [
        `M ${x} ${y + R}`,
        arc(x, y + R, x + R, y, R, c.topLeft),
        `L ${x + w} ${y}`,
        `L ${x + w} ${y + h - R}`,
        arc(x + w, y + h - R, x + w - R, y + h, R, c.bottomRight),
        `L ${x + R} ${y + h}`,
        arc(x + R, y + h, x, y + h - R, R, c.bottomLeft),
        `L ${x} ${y + R}`,
        'Z',
    ].join(' ');
}

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

/** Brand corner tab (Layer 3) — MsqdxCornerBox geometry on the page. */
export function buildCornerTabPath(side: PdfSpreadSide = 'cover'): string {
    const { x, y } = cornerTabOrigin(side);
    const tabW = PDF_CORNER_TAB_WIDTH_PT;
    const tabH = PDF_CORNER_TAB_TOTAL_HEIGHT_PT;
    return buildMsqdxCornerBoxPath(x, y, tabW, tabH, PDF_RADIUS_BUTTON_PT, pdfCornerTabAnchor(side));
}

export function cornerTabLogoPosition(side: PdfSpreadSide): { top: number; left: number } {
    const { x, y } = cornerTabOrigin(side);
    return {
        top: y + PDF_CORNER_TAB_PADDING_TOP_PT,
        left: x + PDF_CORNER_TAB_PADDING_X_PT,
    };
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
