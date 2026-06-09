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
| **Browser-Preview** | `app/dev/pdf-print` → react-pdf Blob + pdf.js **Doppelseiten** (`PrintPreviewSpreadViewer`) |
| pdf.js Worker | `public/pdf.worker.min.mjs` (`scripts/copy-pdfjs-worker.sh`) |
| Preview-Bundle | `lib/paths/pdf-print-preview-bundle.ts` (variant: comprehensive) |
| Preview-Dokument | `components/pdf/preview/PdfPrintPreviewDocument.tsx` → `ProjectReportDocument` |

## Lokal stylen

`npm run dev` → **http://localhost:3333/dev/pdf-print**

## Layout-Regeln

- Hintergrund: `#ffffff`
- Rand: `PDF_PAGE_MARGIN_PT` (40pt), Bindung +8pt auf innerer Spread-Seite
- Inhalt: `PDF_CONTENT_COLUMN_MAX_WIDTH_PT` (420pt) — mittig, linksbündig (`PdfContentColumn`)
- KPIs: Ring-Diagramme im Executive Summary (`PdfScoreCardsFromSpec`), nicht auf dem Deckblatt
- Logo: 52×12pt, nur Deckblatt (`pdfShowsPageLogoForSide`)
- **Inhaltsverzeichnis** nach dem Deckblatt (`lib/paths/pdf-table-of-contents.ts`, `PdfTableOfContents`) — Seitenzahlen aus Page-Keys vor Footer-Injection
- Keine separaten Kapitel-Trennseiten — Abschnitte via `PdfSectionHeader` + statischer `PdfSectionIntro` (`chapterIntros` in `pdf-labels.ts`)
- Section-Header: reine Überschrift, keine farbigen Chips
- Footer: kleines msqdx-Logo + Seitenzahl, fix unten auf Seitenebene (`footer`-Prop auf `PdfPageShell`)
  - gerade Seiten: unten links — Seitenzahl, dann Logo
  - ungerade Seiten: unten rechts — Logo, dann Seitenzahl

## PDF neu rendern (ohne LLM)

Projekt-Seite → „PDF neu rendern (ohne KI)“ oder `downloadProjectReportPdf()` aus `lib/project-report/export-project-report-pdf.tsx`

## Tests

- `__tests__/lib/pdf-print-layout.test.ts`
- `__tests__/lib/pdf-typography.test.ts`
- `__tests__/lib/pdf-print-preview-document.test.ts`
- `__tests__/lib/pdf-spread-groups.test.ts`
- `__tests__/lib/project-report-pdf-smoke.test.ts`
