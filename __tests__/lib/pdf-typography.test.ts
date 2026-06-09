import {
    PDF_PREVIEW_FONT_WEIGHT,
    PDF_TYPE_LINE_HEIGHT,
    PDF_TYPE_WEIGHT,
} from '@/lib/paths/pdf-typography';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';

describe('pdf-typography', () => {
    it('uses tighter unitless line-height ratios than browser defaults', () => {
        expect(PDF_TYPE_LINE_HEIGHT.tight).toBeLessThan(1.2);
        expect(PDF_TYPE_LINE_HEIGHT.snug).toBeLessThan(1.35);
        expect(PDF_TYPE_LINE_HEIGHT.body).toBeLessThan(1.4);
        expect(PDF_TYPE_LINE_HEIGHT.tight).toBeLessThan(PDF_TYPE_LINE_HEIGHT.body);
    });

    it('exposes bold vs light weight tokens for react-pdf', () => {
        expect(PDF_TYPE_WEIGHT.bold).toBe('bold');
        expect(PDF_TYPE_WEIGHT.light).toBe('normal');
    });

    it('mirrors preview font weights for MUI', () => {
        expect(PDF_PREVIEW_FONT_WEIGHT.bold).toBe(700);
        expect(PDF_PREVIEW_FONT_WEIGHT.light).toBeLessThan(PDF_PREVIEW_FONT_WEIGHT.regular);
    });
});

describe('pdf-styles line heights', () => {
    it('keeps react-pdf lineHeight as unitless multipliers (not absolute pt)', () => {
        expect(pdfStyles.leadText.lineHeight).toBe(PDF_TYPE_LINE_HEIGHT.body);
        expect(pdfStyles.metricInterpretationText.lineHeight).toBe(PDF_TYPE_LINE_HEIGHT.body);
        expect(pdfStyles.recommendationTitle.lineHeight).toBe(PDF_TYPE_LINE_HEIGHT.snug);
        expect(pdfStyles.leadText.lineHeight).toBeLessThan(2);
    });

    it('styles metric interpretation as a padded gray group', () => {
        expect(pdfStyles.metricInterpretationGroup.backgroundColor).toBeDefined();
        expect(pdfStyles.metricInterpretationGroup.paddingVertical).toBeGreaterThan(8);
    });

    it('does not use negative intro spacing that pulls text upward', () => {
        expect(pdfStyles.sectionIntroText.marginTop).toBeGreaterThanOrEqual(0);
    });
});
