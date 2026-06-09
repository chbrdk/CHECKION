/** Route for interactive PDF print layout playground (browser preview). */
export const PATH_DEV_PDF_PRINT_PREVIEW = '/dev/pdf-print';

/** CHECKION `npm run dev` default port (see package.json). */
export const CHECKION_DEV_SERVER_PORT = 3333;

export function checkionDevPdfPrintPreviewUrl(basePath = ''): string {
    const path = `${basePath.replace(/\/$/, '')}${PATH_DEV_PDF_PRINT_PREVIEW}`;
    return `http://localhost:${CHECKION_DEV_SERVER_PORT}${path}`;
}

/** PDF points → CSS px helpers (legacy; dev preview uses react-pdf PDFViewer). */
export function pdfPtToCssPx(pt: number): number {
    return pt;
}

/** MUI `sx` length — numeric padding/margin in `sx` is multiplied by theme spacing. */
export function pdfPtToCssLength(pt: number): string {
    return `${pdfPtToCssPx(pt)}px`;
}

export function pdfMarginsToCss(margins: {
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    paddingLeft: number;
}) {
    return {
        paddingTop: pdfPtToCssPx(margins.paddingTop),
        paddingRight: pdfPtToCssPx(margins.paddingRight),
        paddingBottom: pdfPtToCssPx(margins.paddingBottom),
        paddingLeft: pdfPtToCssPx(margins.paddingLeft),
    };
}
