/**
 * MSQDX PDF font families and remote sources (Google Fonts).
 * Aligns with @msqdx/tokens typography: Noto Sans (body), IBM Plex Mono (headlines).
 */

export const PDF_FONT_FAMILIES = {
    body: 'Noto Sans',
    headline: 'IBM Plex Mono',
} as const;

export const PDF_FONT_SOURCES = {
    notoSans: {
        regular:
            'https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A99d.ttf',
        bold: 'https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyAaBN9d.ttf',
    },
    ibmPlexMono: {
        regular: 'https://fonts.gstatic.com/s/ibmplexmono/v20/-F63fjptAgt5VM-kVkqdyU8n5ig.ttf',
        bold: 'https://fonts.gstatic.com/s/ibmplexmono/v20/-F6qfjptAgt5VM-kVkqdyU8n3pQP8lc.ttf',
    },
} as const;
