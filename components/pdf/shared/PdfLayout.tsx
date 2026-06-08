'use client';

/** Re-exports print layout primitives (Doppelseiten + App-Frame). */
export {
    PdfCoverPage,
    PdfPrintPage,
    PdfSpreadPadPage,
    PdfChapterSpreadPages,
    PdfChapterIntroPage,
    PdfContentPage,
    PdfStatGrid,
    PdfDataTable,
    PdfLeadText,
    applyReportFooters,
    isChapterIntroPage,
    appendChapterSpread,
    contentSideForIndex,
} from '@/components/pdf/shared/PdfPrintPages';
