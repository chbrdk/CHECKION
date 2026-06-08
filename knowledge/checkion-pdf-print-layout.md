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

## Visuelles Konzept

- **Deckblatt** (`PdfCoverPage`): Vollflächiger Brand-Hintergrund (#00ca55), innerer Offwhite-Panel mit abgerundeten Ecken (wie `MsqdxAppLayout`), Corner-Tab mit Logo (wie `MsqdxCornerBox` cutdown).
- **Kapitel-Doppelseite** (`PdfChapterSpreadPages`): Links große Kapitelnummer + Akzentring, rechts Titel + Intro-Text.
- **Inhaltsseiten** (`PdfContentPage`): Gleicher App-Frame, **Bundsteg** (extra Padding auf der inneren Seite bei left/right).

## Doppelseiten-Logik

- Seite 1 = Deckblatt (cover)
- Seite 2+ = abwechselnd links/rechts (Druck: Buchbindung)
- Kapitel starten immer mit **linker** Dekor-Seite (gerade Seitenzahl) → ggf. `PdfSpreadPadPage` einfügen

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
