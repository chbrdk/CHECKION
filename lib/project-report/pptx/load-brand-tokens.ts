/**
 * Load MSQDX brand tokens for PPTX masters (from brand-tokens.json).
 */
import fs from 'node:fs';
import {
    getReportPptxBrandTokensAbsolutePath,
    getReportPptxLogoBlackAbsolutePath,
    getReportPptxLogoWhiteAbsolutePath,
} from '@/lib/paths/report-export-templates';

export interface PptxBrandTokens {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    textOnDark: string;
    muted: string;
    surface: string;
    fontHeading: string;
    fontBody: string;
}

const DEFAULT_TOKENS: PptxBrandTokens = {
    primary: 'F256B6',
    secondary: '00CA55',
    accent: 'FF693B',
    text: '000000',
    textOnDark: 'FFFFFF',
    muted: '716E6B',
    surface: 'EAE8E8',
    fontHeading: 'Helvetica Neue',
    fontBody: 'Helvetica Neue',
};

function normalizeHex(value: string): string {
    return value.replace(/^#/, '').toUpperCase();
}

export function loadPptxBrandTokens(cwd = process.cwd()): PptxBrandTokens {
    const path = getReportPptxBrandTokensAbsolutePath(cwd);
    try {
        const raw = JSON.parse(fs.readFileSync(path, 'utf8')) as Partial<PptxBrandTokens>;
        return {
            primary: normalizeHex(raw.primary ?? DEFAULT_TOKENS.primary),
            secondary: normalizeHex(raw.secondary ?? DEFAULT_TOKENS.secondary),
            accent: normalizeHex(raw.accent ?? DEFAULT_TOKENS.accent),
            text: normalizeHex(raw.text ?? DEFAULT_TOKENS.text),
            textOnDark: normalizeHex(raw.textOnDark ?? DEFAULT_TOKENS.textOnDark),
            muted: normalizeHex(raw.muted ?? DEFAULT_TOKENS.muted),
            surface: normalizeHex(raw.surface ?? DEFAULT_TOKENS.surface),
            fontHeading: raw.fontHeading ?? DEFAULT_TOKENS.fontHeading,
            fontBody: raw.fontBody ?? DEFAULT_TOKENS.fontBody,
        };
    } catch {
        return { ...DEFAULT_TOKENS };
    }
}

export interface PptxRenderAssets {
    tokens: PptxBrandTokens;
    logoWhitePath: string;
    logoBlackPath: string;
}

export function loadPptxRenderAssets(cwd = process.cwd()): PptxRenderAssets {
    return {
        tokens: loadPptxBrandTokens(cwd),
        logoWhitePath: getReportPptxLogoWhiteAbsolutePath(cwd),
        logoBlackPath: getReportPptxLogoBlackAbsolutePath(cwd),
    };
}
