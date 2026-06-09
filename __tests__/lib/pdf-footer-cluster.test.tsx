/**
 * Footer: even pages — page number then logo (outer left).
 * Odd pages — logo then page number (outer right).
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { pdfFooterAlignsOuterLeft } from '@/lib/paths/pdf-print-tokens';

vi.mock('@react-pdf/renderer', () => ({
    View: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Text: ({ children }: { children: React.ReactNode }) => <span data-testid="page-text">{children}</span>,
    Svg: ({ children }: { children: React.ReactNode }) => <svg data-testid="logo">{children}</svg>,
    Path: () => <path />,
    StyleSheet: { create: (s: object) => s },
}));

describe('pdfFooterAlignsOuterLeft', () => {
    it('treats even page numbers as outer-left cluster', () => {
        expect(pdfFooterAlignsOuterLeft(2)).toBe(true);
        expect(pdfFooterAlignsOuterLeft(4)).toBe(true);
    });

    it('treats odd page numbers as outer-right cluster', () => {
        expect(pdfFooterAlignsOuterLeft(1)).toBe(false);
        expect(pdfFooterAlignsOuterLeft(3)).toBe(false);
    });
});

describe('PdfFooter cluster order', () => {
    it('renders page number before logo on even pages', async () => {
        const { PdfFooter } = await import('@/components/pdf/shared/PdfPrimitives');
        const { renderToStaticMarkup } = await import('react-dom/server');

        const html = renderToStaticMarkup(
            React.createElement(PdfFooter, {
                pageNumber: 2,
                totalPages: 10,
                locale: 'de',
                spreadSide: 'left',
            }) as React.ReactElement
        );

        const pageIdx = html.indexOf('data-testid="page-text"');
        const logoIdx = html.indexOf('data-testid="logo"');
        expect(pageIdx).toBeGreaterThan(-1);
        expect(logoIdx).toBeGreaterThan(pageIdx);
        expect(html).toContain('Seite 2 von 10');
    });

    it('renders logo before page number on odd pages', async () => {
        const { PdfFooter } = await import('@/components/pdf/shared/PdfPrimitives');
        const { renderToStaticMarkup } = await import('react-dom/server');

        const html = renderToStaticMarkup(
            React.createElement(PdfFooter, {
                pageNumber: 3,
                totalPages: 10,
                locale: 'de',
                spreadSide: 'right',
            }) as React.ReactElement
        );

        const pageIdx = html.indexOf('data-testid="page-text"');
        const logoIdx = html.indexOf('data-testid="logo"');
        expect(logoIdx).toBeGreaterThan(-1);
        expect(pageIdx).toBeGreaterThan(logoIdx);
        expect(html).toContain('Seite 3 von 10');
    });
});
