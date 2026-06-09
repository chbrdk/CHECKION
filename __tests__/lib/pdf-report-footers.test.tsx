/**
 * Report footers must sit on the page shell, not inside the content column.
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('@react-pdf/renderer', () => ({
    Page: ({ children }: { children: React.ReactNode }) => <div data-testid="page">{children}</div>,
    View: ({ children, style }: { children: React.ReactNode; style?: object }) => (
        <div data-style={JSON.stringify(style ?? {})}>{children}</div>
    ),
    Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    StyleSheet: { create: (s: object) => s },
}));

vi.mock('@/components/pdf/shared/PdfAppFrame', () => ({
    PdfMinimalPageChrome: () => <div data-testid="chrome" />,
}));

vi.mock('@/components/pdf/shared/PdfPrimitives', () => ({
    PdfContentColumn: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="content-column">{children}</div>
    ),
    PdfFooter: ({ pageNumber }: { pageNumber: number }) => (
        <div data-testid="footer">Seite {pageNumber}</div>
    ),
}));

describe('applyReportFooters', () => {
    it('passes footer as page prop instead of nesting it in content children', async () => {
        const { PdfContentPage, applyReportFooters } = await import(
            '@/components/pdf/shared/PdfPrintPages'
        );
        const { renderToStaticMarkup } = await import('react-dom/server');

        const pages = applyReportFooters(
            [
                <PdfContentPage key="a" side="left">
                    <span>Body</span>
                </PdfContentPage>,
            ],
            { title: 'Report', locale: 'de' }
        );

        const html = renderToStaticMarkup(pages[0] as React.ReactElement);
        expect(html).toContain('data-testid="footer"');
        expect(html).toContain('data-testid="content-column"');
        expect(html).not.toMatch(/content-column[\s\S]*footer[\s\S]*\/content-column/);
    });
});
