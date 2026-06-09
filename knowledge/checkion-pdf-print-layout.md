# CHECKION PDF Print Layout

Print-optimiertes Report-Layout mit App-Frame und Doppelseiten.

## Zentrale Pfade

| Bereich | Pfad |
|---------|------|
| Print-Tokens | `lib/paths/pdf-print-tokens.ts` |
| SVG Frame Paths | `components/pdf/shared/pdf-frame-path.ts` |
| App-Frame (Brand + Cut Corner) | `components/pdf/shared/PdfAppFrame.tsx` |
| Seiten-Typen | `components/pdf/shared/PdfPrintPages.tsx` |
| Styles | `components/pdf/shared/pdf-styles.ts` |
| Projekt-Report | `components/pdf/ProjectReportDocument.tsx` |
| **Browser-Preview** | `app/dev/pdf-print/page.tsx` → `/dev/pdf-print` |
| Preview-Komponenten | `components/pdf/preview/` |
| Cover-Inhalt (PDF + Preview) | `components/pdf/shared/PdfCoverContent.tsx`, `lib/paths/pdf-cover-copy.ts` |

## Lokal stylen (Browser)

Dev-Server starten (`npm run dev` → **Port 3333**), dann:

**http://localhost:3333/dev/pdf-print**

(Mit `BASE_PATH`, z. B. `/checkion`: `http://localhost:3333/checkion/dev/pdf-print`)

- Gleiche SVG-Rahmen-Pfade wie im PDF (`pdf-frame-path.ts`)
- Doppelseiten nebeneinander: Deckblatt, Kapitel-Spread, Inhalt-Spread
- Zoom, Kapitel-Akzent, Brand-Farbe, Corner-Tab togglen
- Workflow: Preview anpassen → Token/Styles in `pdf-print-tokens.ts` + `pdf-styles.ts` → gemeinsame Cover-Komponente `PdfCoverContent.tsx` → PDF-Re-Export ohne LLM


- **Deckblatt** (`PdfCoverPage`): Vollflächiger Brand-Hintergrund (#00ca55), innerer Offwhite-Panel mit abgerundeten Ecken (wie `MsqdxAppLayout`), Corner-Tab mit Logo (wie `MsqdxCornerBox` cutdown).
- **Kapitel-Doppelseite** (`PdfChapterSpreadPages`): Links große Kapitelnummer + Akzentring, rechts Titel + Intro-Text.
- **Inhaltsseiten** (`PdfContentPage`): Gleicher App-Frame, **Bundsteg** (extra Padding auf der inneren Seite bei left/right).

## Doppelseiten-Logik

- Seite 1 = Deckblatt (cover, alle Ränder)
- Seite 2+ = abwechselnd **links** (gerade) / **rechts** (ungerade)
- **Linke Seite:** Rahmen nur oben, links, unten — rechts bis zur Bindung
- **Rechte Seite:** Rahmen nur oben, rechts, unten — links bis zur Bindung
- PDF-Metadaten: `Document pageLayout="twoPageRight"` (Deckblatt allein, dann Spreads)
- Kapitel starten mit **linker** Dekor-Seite (gerade Seitenzahl) → ggf. `PdfSpreadPadPage`

## Frame-Layer (kein Stroke-Border)

1. **Layer 1 — Brand:** Vollflächiger Seitenhintergrund (`PDF_BRAND_COLOR`)
2. **Layer 2 — Innen-Panel:** Offwhite (`PDF_INNER_BACKGROUND`), kleiner als Seite → sichtbarer Brand-Spalt (`PDF_FRAME_INSET_PT` = 10pt, kein SVG-Stroke)
3. **Layer 3 — Corner-Tab:** **nur oben links** auf Deckblatt + linken Spread-Seiten. Geometrie (Print): `topLeft=square`, `topRight=rounded` (Außenkante), `bottomRight=cutdown-a` + `bottomLeft=cutdown-b` (Übergang ins Innen-Panel). Steuerung: `pdfCornerTabStyles()` + `pdfShowsCornerTabForSide()`. Preview (`PrintPreviewFrame`) und PDF (`buildMsqdxCornerBoxPath`) teilen dieselbe Zuordnung.

Innen-Panel-Radien wie CHECKION mit Sidebar: **topRight + bottomRight = 1.5xl**, **bottomLeft = button**, topLeft = 0 (Logo-Tab).

Karten/Flächen im Content: nur Hintergrund + Radius, **keine** 2px-Ränder.

## Design-Referenz Web

- `components/AppShell.tsx` — `MsqdxAppLayout`, `borderWidth: thin`, `borderRadius: 2xl`
- Design System — `MsqdxCornerBox` (cutdown-a/b), Radien: button 32px, 1.5xl 56px (in PDF halbiert skaliert)

## Tests

- `__tests__/lib/pdf-print-layout.test.ts` — Frame-Pfade + Spread-Helfer
- `__tests__/lib/project-report-pdf-smoke.test.ts` — Document render smoke
- `__tests__/lib/scan-report-pdf-smoke.test.ts` — Scan report print layout
- `__tests__/api/project-report-latest.test.ts` — Gespeichertes Bundle für PDF-Re-Export

## PDF neu rendern (ohne LLM)

Fertige Reports speichern das **Bundle** in `project_report_runs.bundle`. Für Layout-Tests:

- **Projekt-Seite:** Karte „PDF neu rendern (ohne KI)“ → `GET /api/projects/[id]/report/latest` + client-side `@react-pdf/renderer`
- **Report-Historie:** „PDF neu exportieren“ beim neuesten fertigen Run
- Kein neuer LLM-Lauf — nur `downloadProjectReportPdf()` aus `lib/project-report/export-project-report-pdf.tsx`
