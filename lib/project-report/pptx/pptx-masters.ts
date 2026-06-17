/**
 * PptxGenJS slide masters — MSQDX branding aligned with MSQDX_PPT-Master_27-05-26.pptx theme.
 */
import type PptxGenJS from 'pptxgenjs';
import { PPTX_LAYOUT } from '@/lib/paths/report-export-templates';
import type { PptxBrandTokens } from '@/lib/project-report/pptx/load-brand-tokens';

export interface PptxMasterConfig {
    tokens: PptxBrandTokens;
    logoWhitePath: string;
    logoBlackPath: string;
}

function footerBar(tokens: PptxBrandTokens) {
    return {
        rect: {
            x: 0,
            y: 5.15,
            w: 13.33,
            h: 0.45,
            fill: { color: tokens.text },
        },
    };
}

function logoObject(path: string, darkBackground: boolean) {
    return {
        image: {
            path,
            x: 0.35,
            y: darkBackground ? 0.35 : 0.2,
            w: 1.4,
            h: 0.35,
        },
    };
}

export function registerPptxMasters(pptx: PptxGenJS, config: PptxMasterConfig): void {
    const { tokens, logoWhitePath, logoBlackPath } = config;

    pptx.defineSlideMaster({
        title: PPTX_LAYOUT.TITLE,
        background: { color: tokens.text },
        objects: [logoObject(logoWhitePath, true)],
        slideNumber: { x: 12.5, y: 5.2, color: tokens.textOnDark, fontSize: 9 },
    });

    pptx.defineSlideMaster({
        title: PPTX_LAYOUT.SECTION,
        background: { color: tokens.primary },
        objects: [footerBar(tokens), logoObject(logoWhitePath, true)],
        slideNumber: { x: 12.5, y: 5.2, color: tokens.textOnDark, fontSize: 9 },
    });

    const contentObjects = [footerBar(tokens), logoObject(logoBlackPath, false)];

    pptx.defineSlideMaster({
        title: PPTX_LAYOUT.CONTENT,
        background: { color: tokens.textOnDark },
        objects: contentObjects,
        slideNumber: { x: 12.5, y: 5.2, color: tokens.muted, fontSize: 9 },
    });

    pptx.defineSlideMaster({
        title: PPTX_LAYOUT.TWO_COLUMN,
        background: { color: tokens.textOnDark },
        objects: contentObjects,
        slideNumber: { x: 12.5, y: 5.2, color: tokens.muted, fontSize: 9 },
    });

    pptx.defineSlideMaster({
        title: PPTX_LAYOUT.METRICS,
        background: { color: tokens.surface },
        objects: [footerBar(tokens), logoObject(logoBlackPath, false)],
        slideNumber: { x: 12.5, y: 5.2, color: tokens.muted, fontSize: 9 },
    });

    pptx.defineSlideMaster({
        title: PPTX_LAYOUT.CLOSING,
        background: { color: tokens.text },
        objects: [logoObject(logoWhitePath, true)],
        slideNumber: { x: 12.5, y: 5.2, color: tokens.textOnDark, fontSize: 9 },
    });
}
