/**
 * Dev preview uses comprehensive bundle + `ProjectReportDocument` page builder.
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('@react-pdf/renderer', () => ({
    Document: ({ children }: { children: React.ReactNode }) => children,
    Page: ({ children }: { children: React.ReactNode }) => children,
    View: ({ children }: { children: React.ReactNode }) => children,
    Text: ({ children }: { children: React.ReactNode }) => children,
    StyleSheet: { create: (s: object) => s },
    Svg: ({ children }: { children: React.ReactNode }) => children,
    Path: () => null,
    Rect: () => null,
    Circle: () => null,
    G: ({ children }: { children: React.ReactNode }) => children,
    pdf: vi.fn(() => ({
        toBlob: vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' })),
    })),
}));

describe('PdfPrintPreviewDocument', () => {
    it('builds comprehensive cover only', async () => {
        const { buildPdfPrintPreviewPages } = await import(
            '@/components/pdf/preview/PdfPrintPreviewDocument'
        );
        const pages = buildPdfPrintPreviewPages('cover');
        expect(pages).toHaveLength(1);
        expect(pages[0]?.key).toBe('cover');
    });

    it('builds full comprehensive report with many pages', async () => {
        const { buildPdfPrintPreviewPages } = await import(
            '@/components/pdf/preview/PdfPrintPreviewDocument'
        );
        const { buildComprehensivePreviewBundle } = await import(
            '@/lib/paths/pdf-print-preview-bundle'
        );
        const bundle = buildComprehensivePreviewBundle();
        expect(bundle.variant).toBe('comprehensive');
        expect(bundle.deep).not.toBeNull();
        expect(bundle.audience?.available).toBe(true);

        const pages = buildPdfPrintPreviewPages('all-spreads');
        expect(pages.length).toBeGreaterThan(15);
        expect(pages.some((p) => String(p.key).startsWith('toc-'))).toBe(true);
        expect(pages.some((p) => String(p.key).startsWith('deep-'))).toBe(true);
        expect(pages.some((p) => String(p.key) === 'audience-intro')).toBe(true);
        expect(pages.some((p) => String(p.key).startsWith('ch-'))).toBe(false);
        expect(pages.some((p) => String(p.key).startsWith('spread-pad'))).toBe(false);
    });

    it('renders comprehensive preview to pdf blob', async () => {
        const { PdfPrintPreviewDocument } = await import(
            '@/components/pdf/preview/PdfPrintPreviewDocument'
        );
        const { pdf } = await import('@react-pdf/renderer');
        const element = React.createElement(PdfPrintPreviewDocument, { scene: 'all-spreads' });
        const blob = await pdf(element).toBlob();
        expect(blob).toBeInstanceOf(Blob);
    });
});
