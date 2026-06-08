/**
 * MSQDX PDF font families and bundled sources (public/fonts/msqdx).
 * Noto Sans: body (TTF). IBM Plex Mono: headlines (WOFF2 latin — Google TTF breaks fontkit on spaces).
 */

export const PDF_FONT_FAMILIES = {
    body: 'Noto Sans',
    headline: 'IBM Plex Mono',
} as const;

/** URL paths served from public/fonts/msqdx (see knowledge/checkion-project-report.md). */
export const PDF_FONT_BASE_PATH = '/fonts/msqdx';

export const PDF_FONT_SOURCES = {
    notoSans: {
        regular: `${PDF_FONT_BASE_PATH}/noto-sans-regular.ttf`,
        bold: `${PDF_FONT_BASE_PATH}/noto-sans-bold.ttf`,
    },
    ibmPlexMono: {
        regular: `${PDF_FONT_BASE_PATH}/ibm-plex-mono-latin-400-normal.woff2`,
        bold: `${PDF_FONT_BASE_PATH}/ibm-plex-mono-latin-700-normal.woff2`,
    },
} as const;

/** Resolve font src for react-pdf: public URL in browser, absolute file path in Node tests. */
export function resolvePdfFontSrc(publicPath: string): string {
    if (typeof window !== 'undefined') return publicPath;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    return path.join(process.cwd(), 'public', publicPath.replace(/^\//, ''));
}
