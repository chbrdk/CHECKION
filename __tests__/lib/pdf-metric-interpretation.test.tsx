import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
    PdfMetricInterpretationGroup,
    pdfInterpretationTexts,
    PdfRecommendationRow,
} from '@/components/pdf/shared/PdfMetricInterpretation';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';

describe('pdfInterpretationTexts', () => {
    it('filters empty entries', () => {
        expect(pdfInterpretationTexts('A', undefined, '', 'B')).toEqual(['A', 'B']);
    });
});

describe('PdfMetricInterpretationGroup', () => {
    it('renders nothing when all texts are empty', () => {
        const html = renderToStaticMarkup(<PdfMetricInterpretationGroup texts={[]} />);
        expect(html).toBe('');
    });

    it('combines multiple interpretations in one group', () => {
        const html = renderToStaticMarkup(
            <PdfMetricInterpretationGroup texts={['Domain score insight.', 'WCAG insight.']} />
        );
        expect(html).toContain('Domain score insight.');
        expect(html).toContain('WCAG insight.');
    });

    it('splits long text into paragraph blocks', () => {
        const html = renderToStaticMarkup(
            <PdfMetricInterpretationGroup texts={['First paragraph.\n\nSecond paragraph.']} />
        );
        expect(html).toContain('First paragraph.');
        expect(html).toContain('Second paragraph.');
    });

    it('uses a gray background container with generous padding', () => {
        expect(pdfStyles.metricInterpretationGroup.backgroundColor).toBe('#F3F4F6');
        expect(pdfStyles.metricInterpretationGroup.paddingHorizontal).toBe(12);
        expect(pdfStyles.metricInterpretationGroup.paddingVertical).toBeGreaterThanOrEqual(10);
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
