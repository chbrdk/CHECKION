/**
 * PptxGenJS slide masters — MSQDX branding aligned with MSQDX_PPT-Master_27-05-26.pptx theme.
 */
import type PptxGenJS from 'pptxgenjs';
import { PPTX_LAYOUT } from '@/lib/paths/report-export-templates';
import type { PptxBrandTokens } from '@/lib/project-report/pptx/load-brand-tokens';
import { PPTX_SLIDE } from '@/lib/project-report/pptx/pptx-slide-layout';

export interface PptxMasterConfig {
    tokens: PptxBrandTokens;
    logoWhitePath: string | null;
    logoBlackPath: string | null;
}

function footerBar(tokens: PptxBrandTokens) {
    return {
        rect: {
            x: 0,
            y: PPTX_SLIDE.footerBarY,
            w: PPTX_SLIDE.width,
            h: PPTX_SLIDE.footerBarHeight,
            fill: { color: tokens.text },
        },
    };
}

function logoObject(path: string | null) {
    if (!path) return null;
    return {
        image: {
            path,
            x: PPTX_SLIDE.logoX,
            y: PPTX_SLIDE.logoY,
            w: PPTX_SLIDE.logoWidth,
            h: PPTX_SLIDE.logoHeight,
            sizing: { type: 'contain' as const, w: PPTX_SLIDE.logoWidth, h: PPTX_SLIDE.logoHeight },
        },
    };
}

type PptxMasterObject =
    | {
          image: {
              path: string;
              x: number;
              y: number;
              w: number;
              h: number;
              sizing?: { type: 'contain' | 'cover' | 'crop'; w: number; h: number };
          };
      }
    | { rect: { x: number; y: number; w: number; h: number; fill: { color: string } } };

function masterObjects(...objects: Array<PptxMasterObject | null>): PptxMasterObject[] {
    return objects.filter((object): object is PptxMasterObject => object != null);
}

const slideNumber = (tokens: PptxBrandTokens, color: string) => ({
    x: PPTX_SLIDE.slideNumberX,
    y: PPTX_SLIDE.slideNumberY,
    color,
    fontSize: 9,
    fontFace: tokens.fontMono,
});

export function registerPptxMasters(pptx: PptxGenJS, config: PptxMasterConfig): void {
    const { tokens, logoWhitePath, logoBlackPath } = config;

    pptx.defineSlideMaster({
        title: PPTX_LAYOUT.TITLE,
        background: { color: tokens.text },
        objects: masterObjects(logoObject(logoWhitePath)),
        slideNumber: slideNumber(tokens, tokens.textOnDark),
    });

    pptx.defineSlideMaster({
        title: PPTX_LAYOUT.SECTION,
        background: { color: tokens.primary },
        objects: masterObjects(footerBar(tokens), logoObject(logoWhitePath)),
        slideNumber: slideNumber(tokens, tokens.textOnDark),
    });

    const contentObjects = masterObjects(footerBar(tokens), logoObject(logoBlackPath));

    pptx.defineSlideMaster({
        title: PPTX_LAYOUT.CONTENT,
        background: { color: tokens.textOnDark },
        objects: contentObjects,
        slideNumber: slideNumber(tokens, tokens.muted),
    });

    pptx.defineSlideMaster({
        title: PPTX_LAYOUT.TWO_COLUMN,
        background: { color: tokens.textOnDark },
        objects: contentObjects,
        slideNumber: slideNumber(tokens, tokens.muted),
    });

    pptx.defineSlideMaster({
        title: PPTX_LAYOUT.METRICS,
        background: { color: tokens.surface },
        objects: masterObjects(footerBar(tokens), logoObject(logoBlackPath)),
        slideNumber: slideNumber(tokens, tokens.muted),
    });

    pptx.defineSlideMaster({
        title: PPTX_LAYOUT.CLOSING,
        background: { color: tokens.text },
        objects: masterObjects(logoObject(logoWhitePath)),
        slideNumber: slideNumber(tokens, tokens.textOnDark),
    });
}
