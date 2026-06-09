import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
    PdfMetricInterpretationBlock,
    PdfRecommendationRow,
} from '@/components/pdf/shared/PdfMetricInterpretation';

describe('PdfMetricInterpretationBlock', () => {
    it('splits agent text into separate paragraph blocks', () => {
        const html = renderToStaticMarkup(
            <PdfMetricInterpretationBlock
                label="KI-Einordnung"
                text={'First paragraph.\n\nSecond paragraph.'}
            />
        );
        expect(html.match(/First paragraph\./g)?.length).toBe(1);
        expect(html.match(/Second paragraph\./g)?.length).toBe(1);
    });
});

describe('PdfRecommendationRow', () => {
    it('renders title and description in separate blocks', () => {
        const html = renderToStaticMarkup(
            <PdfRecommendationRow title="Issue title" description="Issue description" />
        );
        expect(html).toContain('Issue title');
        expect(html).toContain('Issue description');
    });
});
