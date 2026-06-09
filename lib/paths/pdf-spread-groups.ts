/**
 * Page groupings for PDF `twoPageRight` — cover on the right, then left/right pairs.
 * Used by `/dev/pdf-print` spread preview (pdf.js).
 */

/** One spread row: `[leftPage | null, rightPage | null]` (1-based page numbers). */
export type PdfSpreadSlot = [left: number | null, right: number | null];

/**
 * Matches `PDF_DOCUMENT_PAGE_LAYOUT = 'twoPageRight'` and `pdfSpreadSideFromIndex`.
 * - Spread 1: empty left, cover (page 1) on the right
 * - Spread 2+: even page left, odd page right
 * - Trailing single page sits on the left
 */
export function pdfSpreadSlots(totalPages: number): PdfSpreadSlot[] {
    if (totalPages <= 0) return [];
    const slots: PdfSpreadSlot[] = [[null, 1]];
    let page = 2;
    while (page <= totalPages) {
        if (page + 1 <= totalPages) {
            slots.push([page, page + 1]);
            page += 2;
        } else {
            slots.push([page, null]);
            page += 1;
        }
    }
    return slots;
}
