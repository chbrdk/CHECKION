import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import type { GeoQuestionDetailFact } from '@/lib/project-report/types';
import { getProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';

vi.mock('@react-pdf/renderer', () => ({
    View: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    Font: { register: vi.fn() },
    StyleSheet: { create: (s: object) => s },
}));

const sampleQuestion: GeoQuestionDetailFact = {
    queryText: 'Welche Versicherung empfehlen Makler für Hundehalterhaftpflicht?',
    queryIndex: 1,
    latestPosition: 1.2,
    trend: 'stable',
    positionsByModel: [
        { modelId: 'GPT 5.5', position: 1, cited: true },
        { modelId: 'GPT 5.4-nano', position: 3, cited: true },
    ],
    topCitedDomains: ['haftpflichtkasse.de', 'vhv.de'],
    points: [],
    evidenceId: 'q-1',
};

describe('PdfGeoQuestionCard', () => {
    it('renders question title, model table, and citation table', async () => {
        const { PdfGeoQuestionCard } = await import('@/components/pdf/shared/PdfGeoQuestionCard');
        const labels = getProjectReportPdfLabels('de');
        const html = React.createElement(PdfGeoQuestionCard, {
            question: sampleQuestion,
            labels,
        });
        expect(html).toBeTruthy();
        const { renderToStaticMarkup } = await import('react-dom/server');
        const markup = renderToStaticMarkup(html as React.ReactElement);
        expect(markup).toContain('Welche Versicherung empfehlen Makler');
        expect(markup).toContain('GPT 5.5');
        expect(markup).toContain('#1');
        expect(markup).toContain('haftpflichtkasse.de');
        expect(markup).toContain('Top-Zitationen');
    });
});
