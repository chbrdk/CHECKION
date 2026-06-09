import {
    PDF_PREVIEW_FONT_WEIGHT,
    PDF_TYPE_LINE_HEIGHT,
    PDF_TYPE_WEIGHT,
    pdfLineHeightPt,
} from '@/lib/paths/pdf-typography';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';

describe('pdf-typography', () => {
    it('uses tighter line heights than browser defaults', () => {
        expect(PDF_TYPE_LINE_HEIGHT.tight).toBeLessThan(1.2);
        expect(PDF_TYPE_LINE_HEIGHT.snug).toBeLessThan(1.35);
        expect(PDF_TYPE_LINE_HEIGHT.body).toBeLessThan(1.4);
        expect(PDF_TYPE_LINE_HEIGHT.tight).toBeLessThan(PDF_TYPE_LINE_HEIGHT.body);
    });

    it('computes absolute pt line heights with safe minimum for small body text', () => {
        expect(pdfLineHeightPt(8.5, 'body')).toBeGreaterThanOrEqual(8.5 * 1.4);
        expect(pdfLineHeightPt(9, 'snug')).toBeGreaterThanOrEqual(9 * 1.4);
        expect(pdfLineHeightPt(34, 'tight')).toBeCloseTo(34 * PDF_TYPE_LINE_HEIGHT.tight, 1);
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
    it('uses absolute pt values for interpretation and recommendation blocks', () => {
        expect(pdfStyles.metricInterpretationText.lineHeight).toBeGreaterThan(
            pdfStyles.metricInterpretationText.fontSize!,
        );
        expect(pdfStyles.recommendationTitle.lineHeight).toBeGreaterThan(
            pdfStyles.recommendationTitle.fontSize! * 1.35,
        );
        expect(pdfStyles.leadText.lineHeight).toBeGreaterThan(pdfStyles.leadText.fontSize!);
    });

    it('does not use negative intro spacing that pulls text upward', () => {
        expect(pdfStyles.sectionIntroText.marginTop).toBeGreaterThanOrEqual(0);
    });
});
