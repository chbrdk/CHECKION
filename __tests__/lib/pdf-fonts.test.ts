import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PDF_FONT_FAMILIES, PDF_FONT_SOURCES } from '@/lib/paths/pdf-fonts';

const register = vi.fn();

vi.mock('@react-pdf/renderer', () => ({
    Font: { register },
}));

describe('pdf fonts', () => {
    beforeEach(() => {
        register.mockClear();
        vi.resetModules();
    });

    it('exposes MSQDX-aligned font families and bundled public sources', () => {
        expect(PDF_FONT_FAMILIES.body).toBe('Noto Sans');
        expect(PDF_FONT_FAMILIES.headline).toBe('IBM Plex Mono');
        expect(PDF_FONT_SOURCES.notoSans.regular).toBe('/fonts/msqdx/noto-sans-regular.ttf');
        expect(PDF_FONT_SOURCES.ibmPlexMono.regular).toContain('ibm-plex-mono-latin-400-normal.woff2');
    });

    it('registers body and headline fonts once', async () => {
        vi.resetModules();
        const { registerPdfFonts } = await import('@/components/pdf/shared/register-pdf-fonts');
        registerPdfFonts();
        registerPdfFonts();
        expect(register).toHaveBeenCalledTimes(2);
        expect(register).toHaveBeenCalledWith(
            expect.objectContaining({ family: PDF_FONT_FAMILIES.body })
        );
        expect(register).toHaveBeenCalledWith(
            expect.objectContaining({ family: PDF_FONT_FAMILIES.headline })
        );
    });
});
