import {
    PDF_PREVIEW_FONT_WEIGHT,
    PDF_TYPE_LINE_HEIGHT,
    PDF_TYPE_WEIGHT,
} from '@/lib/paths/pdf-typography';

describe('pdf-typography', () => {
    it('uses tighter line heights than browser defaults', () => {
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
