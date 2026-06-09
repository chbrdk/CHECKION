'use client';

import React from 'react';
import { Document } from '@react-pdf/renderer';
import {
    buildProjectReportPages,
    finalizeProjectReportPages,
} from '@/components/pdf/ProjectReportDocument';
import { PDF_DOCUMENT_PAGE_LAYOUT } from '@/components/pdf/shared/PdfLayout';
import { buildComprehensivePreviewBundle } from '@/lib/paths/pdf-print-preview-bundle';

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
    return (
        <Document pageLayout={PDF_DOCUMENT_PAGE_LAYOUT} title="CHECKION Comprehensive PDF Preview">
            {buildPdfPrintPreviewPages(scene)}
        </Document>
    );
}
