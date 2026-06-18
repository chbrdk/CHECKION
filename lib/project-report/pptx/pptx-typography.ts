/**
 * PPTX typography — font faces, sizes, and layout roles.
 * @see lib/paths/pptx-fonts.ts
 */
import { PPTX_FONT_FACES } from '@/lib/paths/pptx-fonts';

export type PptxTypographyRole =
    | 'title'
    | 'eyebrow'
    | 'body'
    | 'bodyMono'
    | 'chartBullet'
    | 'footer'
    | 'table'
    | 'metricsValue'
    | 'metricsLabel'
    | 'closing'
    | 'chartAxis'
    | 'section';

export type PptxTypographyStyle = {
    fontFace: string;
    fontPt: number;
    lineSpacing: number;
};

/** Smaller sizes than master defaults — more text fits without clipping. */
export const PPTX_TYPOGRAPHY: Record<PptxTypographyRole, PptxTypographyStyle> = {
    title: { fontFace: PPTX_FONT_FACES.primary, fontPt: 22, lineSpacing: 1.12 },
    eyebrow: { fontFace: PPTX_FONT_FACES.mono, fontPt: 11, lineSpacing: 1.15 },
    body: { fontFace: PPTX_FONT_FACES.primary, fontPt: 11, lineSpacing: 1.18 },
    bodyMono: { fontFace: PPTX_FONT_FACES.mono, fontPt: 10, lineSpacing: 1.18 },
    chartBullet: { fontFace: PPTX_FONT_FACES.mono, fontPt: 10, lineSpacing: 1.18 },
    footer: { fontFace: PPTX_FONT_FACES.mono, fontPt: 8, lineSpacing: 1.1 },
    table: { fontFace: PPTX_FONT_FACES.mono, fontPt: 10, lineSpacing: 1.15 },
    metricsValue: { fontFace: PPTX_FONT_FACES.mono, fontPt: 30, lineSpacing: 1 },
    metricsLabel: { fontFace: PPTX_FONT_FACES.mono, fontPt: 10, lineSpacing: 1.15 },
    closing: { fontFace: PPTX_FONT_FACES.primary, fontPt: 14, lineSpacing: 1.2 },
    chartAxis: { fontFace: PPTX_FONT_FACES.mono, fontPt: 9, lineSpacing: 1.1 },
    section: { fontFace: PPTX_FONT_FACES.mono, fontPt: 11, lineSpacing: 1.15 },
};

export function pptxFontSizeHundredths(fontPt: number): number {
    return Math.round(fontPt * 100);
}

/** Lines that read as metadata/KPIs use mono. */
export function isMonoBulletLine(text: string): boolean {
    const trimmed = text.trim();
    return (
        /^AUDION:/i.test(trimmed) ||
        /^WCAG:/i.test(trimmed) ||
        /^UX-Journey:/i.test(trimmed) ||
        /^SEO:/i.test(trimmed) ||
        /^GEO:/i.test(trimmed) ||
        /\d+\s*·\s*\d+/.test(trimmed) ||
        /:\s*\d/.test(trimmed)
    );
}

export function bulletTypographyRole(text: string): 'bodyMono' | 'body' {
    return isMonoBulletLine(text) ? 'bodyMono' : 'body';
}
