/**
 * Text styling for MSQDX master slides with black backgrounds (layouts named * (BK)).
 */
import { ModifyColorHelper, modify } from 'pptx-automizer';
import type { ISlide } from 'pptx-automizer';
import type { ReportSlide } from '@/lib/project-report/pptx/types';
import {
    bulletTypographyRole,
    PPTX_TYPOGRAPHY,
    pptxFontSizeHundredths,
    type PptxTypographyRole,
} from '@/lib/project-report/pptx/pptx-typography';

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

export function applyShapeTypography(role: PptxTypographyRole) {
    const style = PPTX_TYPOGRAPHY[role];
    return (element: Element) => {
        const size = pptxFontSizeHundredths(style.fontPt);
        const tags = ['a:rPr', 'a:defRPr', 'a:endParaRPr'];
        for (const tag of tags) {
            const nodes = element.getElementsByTagName(tag);
            for (let i = 0; i < nodes.length; i += 1) {
                const node = nodes[i] as Element;
                node.setAttribute('sz', String(size));
                let latin = node.getElementsByTagName('a:latin')[0];
                if (!latin) {
                    latin = element.ownerDocument!.createElement('a:latin');
                    node.appendChild(latin);
                }
                latin.setAttribute('typeface', style.fontFace);
            }
        }
    };
}

export function chartOptionsOnBlack(
    opts: Record<string, unknown>
): Record<string, unknown> {
    const axis = PPTX_TYPOGRAPHY.chartAxis;
    return {
        ...opts,
        catAxisLabelColor: MSQDX_TEXT_ON_BLACK,
        valAxisLabelColor: MSQDX_TEXT_ON_BLACK,
        legendColor: MSQDX_TEXT_ON_BLACK,
        dataLabelColor: MSQDX_TEXT_ON_BLACK,
        catAxisLabelFontFace: axis.fontFace,
        valAxisLabelFontFace: axis.fontFace,
        legendFontFace: axis.fontFace,
        catAxisLabelFontSize: axis.fontPt,
        valAxisLabelFontSize: axis.fontPt,
        legendFontSize: axis.fontPt,
    };
}

type ShapeTextOptions = {
    onBlack?: boolean;
    footer?: boolean;
    role?: PptxTypographyRole;
};

export function setShapeText(
    slide: ISlide,
    shapeName: string,
    text: string,
    options: ShapeTextOptions = {}
): void {
    const callbacks = [modify.setText(text)];
    if (options.role) callbacks.push(applyShapeTypography(options.role));
    if (options.onBlack) {
        callbacks.push(options.footer ? applyFooterTextRuns() : applyWhiteTextRuns());
    }
    slide.modifyElement(shapeName, callbacks);
}

export function setShapeBullets(
    slide: ISlide,
    shapeName: string,
    bullets: string[],
    options: ShapeTextOptions = {}
): void {
    if (bullets.length === 0) {
        setShapeText(slide, shapeName, '', options);
        return;
    }

    const onBlack = options.onBlack ?? false;
    const whiteStyle = { color: WHITE_TEXT_COLOR, size: pptxFontSizeHundredths(PPTX_TYPOGRAPHY.body.fontPt) };

    slide.modifyElement(
        shapeName,
        modify.setMultiText(
            bullets.map((bullet) => {
                const role = options.role ?? bulletTypographyRole(bullet);
                const typo = PPTX_TYPOGRAPHY[role];
                return {
                    paragraph: { bullet: true },
                    textRuns: [
                        {
                            text: bullet,
                            style: onBlack
                                ? {
                                      color: WHITE_TEXT_COLOR,
                                      size: pptxFontSizeHundredths(typo.fontPt),
                                  }
                                : { size: pptxFontSizeHundredths(typo.fontPt) },
                        },
                    ],
                };
            })
        )
    );

    slide.modifyElement(shapeName, (element: Element) => {
        const paragraphs = element.getElementsByTagName('a:p');
        for (let index = 0; index < paragraphs.length; index += 1) {
            const role = options.role ?? bulletTypographyRole(bullets[index] ?? '');
            applyShapeTypography(role)(paragraphs[index] as Element);
        }
    });

    if (onBlack) {
        slide.modifyElement(shapeName, [applyWhiteTextRuns()]);
    }
}
