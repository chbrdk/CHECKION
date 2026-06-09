# CHECKION PDF Print Layout (minimal)

Weiße A4-Seiten, einheitliche Ränder, kleines Logo **nur auf dem Deckblatt** oben links. Kein Brand-Rahmen, keine Corner-Box, keine farbigen Kapitel-Flächen.

## Zentrale Pfade

| Bereich | Pfad |
|---------|------|
| Print-Tokens | `lib/paths/pdf-print-tokens.ts` |
| Seiten-Chrome | `components/pdf/shared/PdfAppFrame.tsx` → `PdfMinimalPageChrome` |
| Seiten-Typen | `components/pdf/shared/PdfPrintPages.tsx` |
| Styles | `components/pdf/shared/pdf-styles.ts` |
| Typografie | `lib/paths/pdf-typography.ts` — bold/light Kontrast, line-height 1.12–1.32 |
| Projekt-Report | `components/pdf/ProjectReportDocument.tsx` |
| **Browser-Preview** | `app/dev/pdf-print/page.tsx` → `/dev/pdf-print` |

## Lokal stylen

`npm run dev` → **http://localhost:3333/dev/pdf-print**

## Layout-Regeln

- Hintergrund: `#ffffff`
- Rand: `PDF_PAGE_MARGIN_PT` (40pt), Bindung +8pt auf innerer Spread-Seite
- Logo: 52×12pt, nur Deckblatt (`pdfShowsPageLogoForSide`)
- Kapitel-Spreads: große graue Nummer links, Typo rechts — ohne Akzent-Ringe
- Section-Header: reine Überschrift, keine farbigen Chips
- Footer: Seitenzahl + Titel, ohne Trennlinie

## PDF neu rendern (ohne LLM)

Projekt-Seite → „PDF neu rendern (ohne KI)“ oder `downloadProjectReportPdf()` aus `lib/project-report/export-project-report-pdf.tsx`

## Tests

- `__tests__/lib/pdf-print-layout.test.ts`
- `__tests__/lib/pdf-typography.test.ts`
- `__tests__/lib/project-report-pdf-smoke.test.ts`
