/**
 * KPI score cards render as ring charts (Svg arcs).
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('@react-pdf/renderer', () => ({
    View: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    Svg: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
    Circle: () => <circle />,
    Path: () => <path />,
    Rect: () => <rect />,
    StyleSheet: { create: (s: object) => s },
}));

describe('PdfScoreCardsFromSpec', () => {
    it('renders ring chart markup for score card spec', async () => {
        const { PdfScoreCardsFromSpec } = await import('@/components/pdf/charts/PdfChartComponents');
        const element = React.createElement(PdfScoreCardsFromSpec, {
            spec: {
                kind: 'scoreCards',
                items: [
                    { label: 'Domain', value: 72, color: '#2563eb' },
                    { label: 'SEO', value: 81, color: '#0891b2' },
                ],
            },
        });
        const { renderToStaticMarkup } = await import('react-dom/server');
        const html = renderToStaticMarkup(element as React.ReactElement);
        expect(html).toContain('<circle');
        expect(html).toContain('<path');
    });
});
