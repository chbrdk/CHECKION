'use client';

import React from 'react';
import { Document } from '@react-pdf/renderer';
import {
    buildProjectReportPages,
    finalizeProjectReportPages,
} from '@/components/pdf/ProjectReportDocument';
import { PDF_DOCUMENT_PAGE_LAYOUT } from '@/components/pdf/shared/PdfLayout';
import { buildComprehensivePreviewBundle } from '@/lib/paths/pdf-print-preview-bundle';
import { buildProjectReportOutline } from '@/lib/paths/pdf-chapter-numbering';
import { getProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import { PdfChapterNumberingProvider } from '@/components/pdf/shared/PdfChapterNumbering';

export type PdfPrintPreviewScene = 'cover' | 'content-spread' | 'all-spreads';

function filterPreviewPages(
    pages: React.ReactElement[],
    scene: PdfPrintPreviewScene
): React.ReactElement[] {
    switch (scene) {
        case 'cover':
            return pages.filter((page) => page.key === 'cover');
        case 'content-spread':
            return pages.filter((page) => page.key === 'executive');
        default:
            return pages;
    }
}

/** Comprehensive report — same `ProjectReportDocument` pipeline as production export. */
export function buildPdfPrintPreviewPages(scene: PdfPrintPreviewScene): React.ReactElement[] {
    const bundle = buildComprehensivePreviewBundle();
    const pages = buildProjectReportPages(bundle);
    const filtered = filterPreviewPages(pages, scene);
    return finalizeProjectReportPages(filtered, bundle);
}

export function PdfPrintPreviewDocument({ scene }: { scene: PdfPrintPreviewScene }) {
    const bundle = buildComprehensivePreviewBundle();
    const labels = getProjectReportPdfLabels(bundle.locale);
    const outline = buildProjectReportOutline(bundle, labels);
    const pages = finalizeProjectReportPages(
        filterPreviewPages(buildProjectReportPages(bundle), scene),
        bundle
    );

    return (
        <Document pageLayout={PDF_DOCUMENT_PAGE_LAYOUT} title="CHECKION Comprehensive PDF Preview">
            <PdfChapterNumberingProvider outline={outline}>{pages}</PdfChapterNumberingProvider>
        </Document>
    );
}
