import { Font } from '@react-pdf/renderer';
import {
    PDF_FONT_FAMILIES,
    PDF_FONT_SOURCES,
    resolvePdfFontSrc,
} from '@/lib/paths/pdf-fonts';

let registered = false;

export function registerPdfFonts(): void {
    if (registered) return;

    Font.register({
        family: PDF_FONT_FAMILIES.body,
        fonts: [
            {
                src: resolvePdfFontSrc(PDF_FONT_SOURCES.notoSans.regular),
                fontWeight: 400,
            },
            {
                src: resolvePdfFontSrc(PDF_FONT_SOURCES.notoSans.bold),
                fontWeight: 700,
            },
        ],
    });

    Font.register({
        family: PDF_FONT_FAMILIES.headline,
        fonts: [
            {
                src: resolvePdfFontSrc(PDF_FONT_SOURCES.ibmPlexMono.regular),
                fontWeight: 400,
            },
            {
                src: resolvePdfFontSrc(PDF_FONT_SOURCES.ibmPlexMono.bold),
                fontWeight: 700,
            },
        ],
    });

    registered = true;
}

/** Preload all PDF fonts before client-side export (avoids race during layout). */
export async function ensurePdfFontsLoaded(): Promise<void> {
    registerPdfFonts();
    await Promise.all([
        Font.load({ fontFamily: PDF_FONT_FAMILIES.body, fontWeight: 400 }),
        Font.load({ fontFamily: PDF_FONT_FAMILIES.body, fontWeight: 700 }),
        Font.load({ fontFamily: PDF_FONT_FAMILIES.headline, fontWeight: 400 }),
        Font.load({ fontFamily: PDF_FONT_FAMILIES.headline, fontWeight: 700 }),
    ]);
}

registerPdfFonts();
