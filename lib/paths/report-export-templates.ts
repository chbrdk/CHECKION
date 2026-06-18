/**
 * Central paths for report export assets (PDF/PPTX). Never hardcode in renderers.
 * @see knowledge/checkion-report-pptx-export-design.md
 * @see knowledge/msqdx-ppt-master-layout-mapping.md
 */

import path from 'node:path';

/** Repo-relative default for CHECKION executive report PPTX master. */
export const REPORT_PPTX_MASTER_RELATIVE_PATH =
    'assets/report-templates/MSQDX_PPT-Master_27-05-26.pptx';

export const REPORT_PPTX_LOGO_WHITE_RELATIVE_PATH =
    'assets/report-templates/PNG/MSQDX_Logotype_White.png';

export const REPORT_PPTX_LOGO_BLACK_RELATIVE_PATH =
    'assets/report-templates/PNG/MSQDX_Logotype_Black.png';

export const REPORT_PPTX_BRAND_TOKENS_RELATIVE_PATH = 'assets/report-templates/brand-tokens.json';

/** Placeholder geometry + text budgets extracted from MSQDX PPT master. */
export const REPORT_PPTX_ZONE_CALIBRATION_RELATIVE_PATH =
    'assets/report-templates/msqdx-ppt-zone-calibration.json';

export function getReportPptxMasterAbsolutePath(cwd = process.cwd()): string {
    const fromEnv = process.env.CHECKION_REPORT_PPTX_MASTER_PATH?.trim();
    if (fromEnv) return fromEnv;
    return path.join(cwd, REPORT_PPTX_MASTER_RELATIVE_PATH);
}

export function getReportPptxLogoWhiteAbsolutePath(cwd = process.cwd()): string {
    const fromEnv = process.env.CHECKION_REPORT_PPTX_LOGO_WHITE_PATH?.trim();
    if (fromEnv) return fromEnv;
    return path.join(cwd, REPORT_PPTX_LOGO_WHITE_RELATIVE_PATH);
}

export function getReportPptxLogoBlackAbsolutePath(cwd = process.cwd()): string {
    const fromEnv = process.env.CHECKION_REPORT_PPTX_LOGO_BLACK_PATH?.trim();
    if (fromEnv) return fromEnv;
    return path.join(cwd, REPORT_PPTX_LOGO_BLACK_RELATIVE_PATH);
}

export function getReportPptxBrandTokensAbsolutePath(cwd = process.cwd()): string {
    const fromEnv = process.env.CHECKION_REPORT_PPTX_BRAND_TOKENS_PATH?.trim();
    if (fromEnv) return fromEnv;
    return path.join(cwd, REPORT_PPTX_BRAND_TOKENS_RELATIVE_PATH);
}

export function getReportPptxZoneCalibrationAbsolutePath(cwd = process.cwd()): string {
    const fromEnv = process.env.CHECKION_REPORT_PPTX_ZONE_CALIBRATION_PATH?.trim();
    if (fromEnv) return fromEnv;
    return path.join(cwd, REPORT_PPTX_ZONE_CALIBRATION_RELATIVE_PATH);
}

/** @deprecated Use getReportPptxLogoBlackAbsolutePath */
export function getReportPptxLogoDarkAbsolutePath(cwd = process.cwd()): string {
    return getReportPptxLogoBlackAbsolutePath(cwd);
}

/** Semantic layout keys used by PptxGenJS defineSlideMaster(). */
export const PPTX_LAYOUT = {
    TITLE: 'MSQDX_TITLE',
    SECTION: 'MSQDX_SECTION',
    CONTENT: 'MSQDX_CONTENT',
    TWO_COLUMN: 'MSQDX_TWO_COLUMN',
    METRICS: 'MSQDX_METRICS',
    CLOSING: 'MSQDX_CLOSING',
} as const;

/** Layout names inside MSQDX_PPT-Master_27-05-26.pptx (for pptx-automizer Phase 2). */
export const PPTX_MSQDX_MASTER_LAYOUT = {
    TITLE: 'Hero 2 (BK)',
    SECTION: 'Divider (BK)',
    CONTENT: 'Text only (BK)',
    TWO_COLUMN: 'Text only 2 columns (BK)',
    METRICS: 'Text on 3 tiles (BK)',
    CLOSING: 'Quote (black)',
} as const;

/**
 * Example slide numbers in MSQDX_PPT-Master_27-05-26.pptx that showcase each layout.
 * Used by pptx-automizer as clone sources (not included in output).
 */
export const PPTX_MSQDX_TEMPLATE_SLIDES = {
    TITLE: 11,
    SECTION: 20,
    CONTENT: 26,
    TWO_COLUMN: 34,
    METRICS: 49,
    CLOSING: 60,
} as const;

/** Alias used when loading the master template into pptx-automizer. */
export const PPTX_MSQDX_TEMPLATE_ALIAS = 'msqdx';

export const PPTX_PLACEHOLDER = {
    TITLE: 'TITLE',
    SUBTITLE: 'SUBTITLE',
    BODY: 'BODY',
    FOOTER_LEFT: 'FOOTER_LEFT',
    FOOTER_RIGHT: 'FOOTER_RIGHT',
    LOGO: 'LOGO',
} as const;
