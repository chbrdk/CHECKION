/**
 * Cover content is shared by PDF export and `/dev/pdf-print` (react-pdf PDFViewer).
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('@react-pdf/renderer', () => ({
    View: ({ children }: { children: React.ReactNode }) => children,
    Text: ({ children }: { children: React.ReactNode }) => children,
    StyleSheet: { create: (s: object) => s },
}));


describe('PdfCoverContent', () => {
    it('exports project and scan cover components', async () => {
        const mod = await import('@/components/pdf/shared/PdfCoverContent');
        expect(mod.PdfProjectReportCoverContent).toBeTypeOf('function');
        expect(mod.PdfScanReportCoverContent).toBeTypeOf('function');
    });

    it('ProjectReportDocument uses shared cover component', async () => {
        const src = await import('fs/promises').then((fs) =>
            fs.readFile(
                `${process.cwd()}/components/pdf/ProjectReportDocument.tsx`,
                'utf8'
            )
        );
        expect(src).toContain('PdfProjectReportCoverContent');
        expect(src).toContain('pdfCoverEyebrow');
        expect(src).toContain('PdfScoreCardsFromSpec');
        expect(src).not.toMatch(/PdfProjectReportCoverContent[\s\S]*scoreCards=/);
    });
});
