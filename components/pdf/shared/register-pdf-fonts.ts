import { Font } from '@react-pdf/renderer';
import { PDF_FONT_FAMILIES, PDF_FONT_SOURCES } from '@/lib/paths/pdf-fonts';

let registered = false;

export function registerPdfFonts(): void {
    if (registered) return;

    Font.register({
        family: PDF_FONT_FAMILIES.body,
        fonts: [
            { src: PDF_FONT_SOURCES.notoSans.regular, fontWeight: 400 },
            { src: PDF_FONT_SOURCES.notoSans.bold, fontWeight: 700 },
        ],
    });

    Font.register({
        family: PDF_FONT_FAMILIES.headline,
        fonts: [
            { src: PDF_FONT_SOURCES.ibmPlexMono.regular, fontWeight: 400 },
            { src: PDF_FONT_SOURCES.ibmPlexMono.bold, fontWeight: 700 },
        ],
    });

    registered = true;
}

registerPdfFonts();
