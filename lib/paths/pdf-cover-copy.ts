/** Shared cover copy helpers — used by PDF export and `/dev/pdf-print` preview. */

export const PDF_COVER_BRAND_LABEL = 'CHECKION';

export function pdfCoverEyebrow(subtitle: string): string {
    return `${PDF_COVER_BRAND_LABEL} · ${subtitle}`;
}
