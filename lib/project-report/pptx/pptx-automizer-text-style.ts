/**
 * Text styling for MSQDX master slides with black backgrounds (layouts named * (BK)).
 */
import { ModifyColorHelper, modify } from 'pptx-automizer';
import type { ISlide } from 'pptx-automizer';
import type { ReportSlide } from '@/lib/project-report/pptx/types';

/** MSQDX text on black — matches brand-tokens.json textOnDark. */
export const MSQDX_TEXT_ON_BLACK = 'FFFFFF';

/** Muted footer on black slides. */
export const MSQDX_FOOTER_ON_BLACK = 'EAE8E8';

const WHITE_TEXT_COLOR = { type: 'srgbClr' as const, value: MSQDX_TEXT_ON_BLACK };
const FOOTER_TEXT_COLOR = { type: 'srgbClr' as const, value: MSQDX_FOOTER_ON_BLACK };

/** Layouts cloned from MSQDX master slides with black backgrounds. */
export const MSQDX_BLACK_BACKGROUND_LAYOUTS = new Set<ReportSlide['layout']>([
    'TITLE',
    'SECTION',
    'CONTENT',
    'TWO_COLUMN',
    'METRICS',
    'CLOSING',
]);

export function layoutHasBlackBackground(layout: ReportSlide['layout']): boolean {
    return MSQDX_BLACK_BACKGROUND_LAYOUTS.has(layout);
}

export function applyWhiteTextRuns() {
    return (element: Element) => {
        const tags = ['a:rPr', 'a:endParaRPr', 'a:defRPr'];
        for (const tag of tags) {
            const nodes = element.getElementsByTagName(tag);
            for (let i = 0; i < nodes.length; i += 1) {
                ModifyColorHelper.solidFill(WHITE_TEXT_COLOR)(nodes[i] as Element);
            }
        }
    };
}

export function applyFooterTextRuns() {
    return (element: Element) => {
        const tags = ['a:rPr', 'a:endParaRPr', 'a:defRPr'];
        for (const tag of tags) {
            const nodes = element.getElementsByTagName(tag);
            for (let i = 0; i < nodes.length; i += 1) {
                ModifyColorHelper.solidFill(FOOTER_TEXT_COLOR)(nodes[i] as Element);
            }
        }
    };
}

export function chartOptionsOnBlack(
    opts: Record<string, unknown>
): Record<string, unknown> {
    return {
        ...opts,
        catAxisLabelColor: MSQDX_TEXT_ON_BLACK,
        valAxisLabelColor: MSQDX_TEXT_ON_BLACK,
        legendColor: MSQDX_TEXT_ON_BLACK,
        dataLabelColor: MSQDX_TEXT_ON_BLACK,
    };
}

export function setShapeText(
    slide: ISlide,
    shapeName: string,
    text: string,
    options: { onBlack?: boolean; footer?: boolean } = {}
): void {
    const callbacks = [modify.setText(text)];
    if (options.onBlack) {
        callbacks.push(options.footer ? applyFooterTextRuns() : applyWhiteTextRuns());
    }
    slide.modifyElement(shapeName, callbacks);
}

export function setShapeBullets(
    slide: ISlide,
    shapeName: string,
    bullets: string[],
    onBlack = false
): void {
    if (bullets.length === 0) {
        setShapeText(slide, shapeName, '', { onBlack });
        return;
    }

    if (!onBlack) {
        slide.modifyElement(shapeName, [modify.setBulletList(bullets)]);
        return;
    }

    const whiteStyle = { color: WHITE_TEXT_COLOR };
    slide.modifyElement(
        shapeName,
        modify.setMultiText(
            bullets.map((bullet) => ({
                paragraph: { bullet: true },
                textRuns: [{ text: bullet, style: whiteStyle }],
            }))
        )
    );
}
