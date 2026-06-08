import { describe, it, expect } from 'vitest';
import { pdfCoverEyebrow, PDF_COVER_BRAND_LABEL } from '@/lib/paths/pdf-cover-copy';

describe('pdf-cover-copy', () => {
    it('builds eyebrow from brand label and subtitle', () => {
        expect(PDF_COVER_BRAND_LABEL).toBe('CHECKION');
        expect(pdfCoverEyebrow('Executive Lagebild')).toBe('CHECKION · Executive Lagebild');
    });
});
