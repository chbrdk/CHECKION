import {
    PDF_CORNER_CUT_PT,
    PDF_CORNER_TAB_HEIGHT_PT,
    PDF_CORNER_TAB_WIDTH_PT,
    PDF_FRAME_BORDER_PT,
    PDF_FRAME_INSET_PT,
    PDF_PAGE_HEIGHT_PT,
    PDF_PAGE_WIDTH_PT,
    PDF_RADIUS_1_5XL_PT,
    PDF_RADIUS_BUTTON_PT,
} from '@/lib/paths/pdf-print-tokens';

export type RoundedRectRadii = {
    topLeft: number;
    topRight: number;
    bottomRight: number;
    bottomLeft: number;
};

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

/** Inner app panel — matches MsqdxAppLayout with corner tab (top-left square). */
export function buildAppInnerFramePath(
    pageW = PDF_PAGE_WIDTH_PT,
    pageH = PDF_PAGE_HEIGHT_PT
): string {
    const inset = PDF_FRAME_INSET_PT;
    const x = inset;
    const y = inset;
    const w = pageW - inset * 2;
    const h = pageH - inset * 2;

    return buildRoundedRectPath(x, y, w, h, {
        topLeft: 0,
        topRight: PDF_RADIUS_BUTTON_PT,
        bottomLeft: PDF_RADIUS_1_5XL_PT,
        bottomRight: PDF_RADIUS_1_5XL_PT,
    });
}

/**
 * Brand corner tab with cutdown-a (top-right) and cutdown-b (bottom-left) approximated via arcs.
 */
export function buildCornerTabPath(
    pageW = PDF_PAGE_WIDTH_PT,
    inset = PDF_FRAME_INSET_PT
): string {
    const tabW = PDF_CORNER_TAB_WIDTH_PT;
    const tabH = PDF_CORNER_TAB_HEIGHT_PT;
    const cut = PDF_CORNER_CUT_PT;
    const x = inset;
    const y = inset;

    const rBr = PDF_RADIUS_BUTTON_PT;

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

export function buildAppFrameStrokePath(
    pageW = PDF_PAGE_WIDTH_PT,
    pageH = PDF_PAGE_HEIGHT_PT
): string {
    const inset = PDF_FRAME_INSET_PT;
    const border = PDF_FRAME_BORDER_PT;
    const outer = buildAppInnerFramePath(pageW, pageH);
    const inner = buildRoundedRectPath(
        inset + border,
        inset + border,
        pageW - (inset + border) * 2,
        pageH - (inset + border) * 2,
        {
            topLeft: 0,
            topRight: Math.max(PDF_RADIUS_BUTTON_PT - border, 4),
            bottomLeft: Math.max(PDF_RADIUS_1_5XL_PT - border, 4),
            bottomRight: Math.max(PDF_RADIUS_1_5XL_PT - border, 4),
        }
    );
    return `${outer} ${inner}`;
}
