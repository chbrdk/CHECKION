# CHECKION Project Report — PowerPoint Export (Design)

**Stand:** 2026-06-16  
**Status:** Design / ready for implementation  
**Parity-Ziel:** Gleiche Datenquelle wie PDF (`ProjectReportBundle` aus `report/latest`)

Verwandt: `knowledge/checkion-pdf-print-layout.md`, `lib/paths/pdf-chapter-numbering.ts`

---

## Kurzantwort: Hilft ein Master?

**Ja — unbedingt.** Ein mitgelieferter Master beschleunigt Implementierung und Qualität deutlich.

| Was du lieferst | Nutzen |
|-----------------|--------|
| **`.pptx` mit Slide Masters** (empfohlen) | Corporate Look 1:1, Placeholder-Namen, Footer/Logo fix |
| **Logo PNG** (transparent, ≥ 400px breit) | Titelfolie + Footer |
| **Farben + Fonts** (Hex + Schriftnamen) | Fallback wenn kein Master |
| **Beispiel-Export** (1 manuell gebaute Folie pro Layout-Typ) | Abnahme-Referenz |

Ohne Master bauen wir mit **PptxGenJS `defineSlideMaster()`** und msqdx-Design-Tokens — funktioniert, wirkt aber weniger „Agentur-fertig“.

---

## Architektur

```
ProjectReportBundle (JSON, bereits in DB)
        │
        ├─► renderProjectReportPdf()     ← existiert (@react-pdf)
        └─► renderProjectReportPptx()    ← neu (pptxgenjs + optional Template)
                │
                ▼
        GET /api/projects/{id}/report/pptx
        GET /api/projects/{id}/report/latest/pptx   (Re-Export, kein LLM)
```

**Kein** PDF→PPTX-Konvertieren. **Ja** zur Wiederverwendung der PDF-Display-Helper:

- `pdf-findings-display.ts`, `pdf-recommendations-display.ts`
- `pdf-echon-display.ts`, `pdf-metrics-display.ts`
- `pdf-competitive-display.ts`
- `buildProjectReportOutline()` (Kapitel-Reihenfolge)

Neues Modul: `lib/project-report/pptx/` (Renderer), analog `components/pdf/`.

---

## Technologie

| Komponente | Wahl | Version (2026) |
|------------|------|----------------|
| PPTX-Generator | **pptxgenjs** | ^4.x |
| Layout | `LAYOUT_WIDE` (16:9) | Standard |
| Master | `defineSlideMaster()` **oder** Template-PPTX | siehe unten |
| Charts MVP | Tabelle + KPI-Zahlen; Phase 2: `slide.addChart()` oder PNG | — |

**Template-Strategien (zwei Wege):**

1. **Code-Master (Phase 1a):** Assets unter `assets/report-templates/` + `defineSlideMaster()` in `pptx-masters.ts`
2. **Mitgelieferter Master (Phase 1b, empfohlen mit deinem File):** `assets/report-templates/msqdx-executive-master.pptx` — Layout-Namen in Code mappen; Inhalte in Placeholder schreiben. Falls Placeholder-Namen nicht exportierbar: einmalig Master in Code nachbauen anhand deiner `.pptx`.

Optional später: **pptx-automizer** wenn wir in *bestehende* Firmen-`.potx` injizieren müssen (Merge in Template statt Neugenerierung).

---

## Master-Anforderungen (für dich)

Bitte eine **`.pptx`** (PowerPoint 2016+), 16:9, mit diesen **Layout-Typen**:

| Layout-Name (Vorschlag) | Verwendung |
|-------------------------|------------|
| `MSQDX_TITLE` | Titelfolie (Projektname, Datum, Untertitel) |
| `MSQDX_SECTION` | Kapitel-Trenner („SEO & Rankings“) |
| `MSQDX_CONTENT` | Fließtext + Bullets |
| `MSQDX_TWO_COLUMN` | Tabelle links, Bullets rechts |
| `MSQDX_METRICS` | KPI-Kacheln (3–4 Spalten) |
| `MSQDX_CLOSING` | Empfehlungen / Nächste Schritte |

**Placeholder** (in PowerPoint: Ansicht → Folienmaster → „Textplatzhalter benennen“ oder feste Shapes mit erkennbaren Namen):

| Placeholder | Inhalt |
|-------------|--------|
| `TITLE` | Folientitel / Kapitel |
| `SUBTITLE` | Eyebrow / Projektname |
| `BODY` | Bullets, Fließtext |
| `FOOTER_LEFT` | Projekt + Datum |
| `FOOTER_RIGHT` | „CHECKION · MSQDX“ |
| `LOGO` | Logo-Shape (oder wir ersetzen per Code) |

**Mitliefern als ZIP oder Repo-Pfad:**

```
CHECKION/assets/report-templates/
  msqdx-executive-master.pptx    # dein Master
  msqdx-logo-dark.png            # optional separat
  brand-tokens.json              # optional: { primary, secondary, fontHeading, fontBody }
```

`brand-tokens.json` Beispiel:

```json
{
  "primary": "#0088CC",
  "text": "#1A1A1A",
  "muted": "#6B7280",
  "fontHeading": "Helvetica Neue",
  "fontBody": "Helvetica Neue"
}
```

---

## Slide-Schema (MVP)

Spiegelung der PDF-Outline (`buildProjectReportOutline`). **Executive** und **Comprehensive** Varianten — Comprehensive bekommt mehr Folien.

### Globale Regeln

- Max. **6 Bullet-Zeilen** pro Folie; Rest → Folie 2
- Tabellen max. **8 Zeilen**; Rest gekürzt + „Details im PDF“
- Charts MVP: **Wertetabelle** (wie PDF-Fallback), keine SVG-Grafik
- Sprache: `bundle.locale` (`de` | `en`) — Labels aus `getProjectReportPdfLabels(locale)` wiederverwenden
- Evidence-IDs (`[E123]`) strippen (`stripPdfEvidenceMarkers`)

### Folienliste

| # | `slideId` | Layout | Quelle im Bundle | Bedingung |
|---|-----------|--------|------------------|-----------|
| 1 | `cover` | `MSQDX_TITLE` | `project`, `generatedAt`, `variant` | immer |
| 2 | `agenda` | `MSQDX_CONTENT` | `buildProjectReportOutline()` | immer (TOC als Bullets) |
| 3 | `executive-summary` | `MSQDX_CONTENT` | `narrative.executiveSummary` | wenn vorhanden |
| 4 | `executive-scores` | `MSQDX_METRICS` | `visuals` scoreCards | wenn scoreCards |
| 5 | `executive-competitors` | `MSQDX_TWO_COLUMN` | `narrative.competitiveLandscape` + competitor chart spec | wenn comprehensive + data |
| 6 | `market` | `MSQDX_CONTENT` | `marketContext` via `buildEchonMarketPdfContent()` | `hasMarketSignals` |
| 7 | `market-findings` | `MSQDX_CONTENT` | `marketContext.keyFindings` | optional |
| 8 | `quality` | `MSQDX_METRICS` + Bullets | `domain` metrics, `narrative.siteQuality` | wenn domain |
| 9 | `quality-issues` | `MSQDX_CONTENT` | `domain.systemicIssues` (top 5) | wenn issues |
| 10 | `seo` | `MSQDX_TWO_COLUMN` | rankings + on-page summary | wenn rankings/domain |
| 11 | `seo-keywords` | Tabelle | `rankings.keywords` top 10 | wenn rankings |
| 12 | `geo` | `MSQDX_METRICS` | `geo` scores | wenn geo |
| 13 | `geo-insights` | `MSQDX_CONTENT` | `deep.geoDeep.deterministicInsights` | comprehensive |
| 14 | `topics` | Tabelle | page topics visual spec | wenn topics chart |
| 15 | `audience-intro` | `MSQDX_SECTION` | audience overlay summary | `audience.available` |
| 16 | `audience-persona-{id}` | `MSQDX_TWO_COLUMN` | je `audience.personas[]` | max 4 Personas MVP |
| 17 | `findings` | `MSQDX_CONTENT` | `filterFindingsForPdf(narrative.findings)` | wenn findings |
| 18 | `actions` | `MSQDX_CONTENT` | `filterRecommendationsForPdf(...)` | immer wenn recommendations |
| 19 | `journey` | `MSQDX_CONTENT` | `journey` summary | wenn journey |
| 20 | `closing` | `MSQDX_CLOSING` | Top 3 recommendations + Links | immer |

**Executive-Variante:** Folien 1–4, 8–12, 17–20 (kein Market/Audience/Deep).

**Folienlimit MVP:** max. **25 Folien** (Personas capped, Tabellen gekürzt).

---

## Internes Slide-Modell

Zwischenformat (testbar ohne PPTX-Binary):

```typescript
// lib/project-report/pptx/types.ts
export type ReportSlide =
  | { kind: 'cover'; title: string; subtitle: string; date: string; variant: string }
  | { kind: 'section'; title: string; chapterNumber?: string }
  | { kind: 'bullets'; title: string; bullets: string[]; lead?: string }
  | { kind: 'metrics'; title: string; items: Array<{ label: string; value: string; tone?: 'good' | 'warn' | 'bad' }> }
  | { kind: 'table'; title: string; headers: string[]; rows: string[][] }
  | { kind: 'two_column'; title: string; left: ReportSlideContent; right: ReportSlideContent };

export type ProjectReportPptxPlan = {
  locale: 'de' | 'en';
  variant: string;
  slides: ReportSlide[];
};
```

Pipeline:

```
bundle → buildProjectReportPptxPlan(bundle) → renderPptxBuffer(plan, masterConfig) → Buffer
```

---

## API-Design

### Pfade (central — `lib/constants.ts`)

```typescript
export const apiProjectReportPptx = (id: string) =>
  `${API_PROJECTS}/${encodeURIComponent(id)}/report/pptx`;

export const apiProjectReportLatestPptx = (id: string) =>
  `${API_PROJECTS}/${encodeURIComponent(id)}/report/latest/pptx`;
```

Template-Pfad (nicht hardcoden im Renderer):

```typescript
// lib/paths/report-export-templates.ts
export const REPORT_PPTX_MASTER_PATH =
  process.env.CHECKION_REPORT_PPTX_MASTER_PATH ??
  'assets/report-templates/msqdx-executive-master.pptx';
```

### Endpoints

#### `GET /api/projects/[id]/report/latest/pptx`

Re-Export aus letztem gespeicherten Bundle (**kein LLM**), analog `report/latest` + PDF.

| Query | Typ | Default |
|-------|-----|---------|
| `locale` | `de` \| `en` | aus Bundle |
| `variant` | `executive` \| `comprehensive` | aus Bundle |

**Response:**

```
Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation
Content-Disposition: attachment; filename="checkion-report-{projectSlug}-{date}.pptx"
```

**Errors:**

| Status | Body |
|--------|------|
| 404 | `{ success: false, error: 'no_report' }` |
| 503 | `{ success: false, error: 'pptx_render_failed' }` |

#### `POST /api/projects/[id]/report/pptx` (optional Phase 2)

Body: `{ bundle?: ProjectReportBundle }` — nur für Dev/Integration; Production nutzt `latest`.

### UI (`ProjectReportExport.tsx`)

Neben „PDF exportieren“:

- Button **„PowerPoint“** / „Als PPTX“
- Gleiche Voraussetzung: `storedReport` / completed run
- Tooltip: „Präsentationsfolien — für Bearbeitung in PowerPoint“
- i18n: `projectReport.exportPptx`, `projectReport.reexportPptxDescription`

### PLEXON Assistant Reports (Phase 2)

```
POST /api/integrations/plexon/assistant-report/pptx
```

Spiegel von `assistant-report/pdf` — gleiches `UiLayout` → vereinfachtes 8-Folien-Deck.

---

## Datei-Plan (Implementation)

| Datei | Aufgabe |
|-------|---------|
| `lib/paths/report-export-templates.ts` | Master-Pfad, Env |
| `lib/project-report/pptx/types.ts` | Slide-Plan Types |
| `lib/project-report/pptx/build-pptx-plan.ts` | Bundle → `ReportSlide[]` |
| `lib/project-report/pptx/pptx-masters.ts` | Master-Definitionen |
| `lib/project-report/pptx/render-pptx.ts` | Plan → Buffer |
| `lib/project-report/export-project-report-pptx.ts` | Client helper (download) |
| `app/api/projects/[id]/report/latest/pptx/route.ts` | API |
| `__tests__/lib/build-pptx-plan.test.ts` | Plan-Snapshot tests |
| `__tests__/lib/render-pptx-smoke.test.ts` | Buffer starts with PK (zip) |
| `assets/report-templates/` | **Dein Master hier** |

---

## Implementierungsphasen

| Phase | Inhalt | Dauer |
|-------|--------|-------|
| **1a** | `build-pptx-plan` + API `latest/pptx` + Cover/Executive/Actions | 3–4 Tage |
| **1b** | Master einbinden + Section layouts | 2–3 Tage (mit deinem `.pptx`) |
| **2** | Comprehensive: Market, Audience, Geo deep | 3–4 Tage |
| **3** | Charts als PNG oder native PPTX charts | 3–5 Tage |
| **4** | PLEXON assistant-report/pptx | 2 Tage |

---

## Tests

```typescript
// build-pptx-plan.test.ts
it('executive variant omits audience slides', () => { ... });
it('caps personas at 4', () => { ... });
it('strips evidence markers from bullets', () => { ... });

// render-pptx-smoke.test.ts
it('produces valid pptx zip', async () => {
  const buf = await renderProjectReportPptx(minimalBundle);
  expect(buf[0]).toBe(0x50); // 'P'
  expect(buf[1]).toBe(0x4b); // 'K'
});
```

Manuell: Öffnen in PowerPoint / Keynote — keine „Reparatur erforderlich“-Dialoge.

---

## Was du jetzt schicken kannst

1. **`msqdx-executive-master.pptx`** mit den 6 Layout-Typen oben  
2. **Logo PNG** (dark + optional light)  
3. **`brand-tokens.json`** oder Link ins Design System  
4. Optional: **1 Beispiel-Report** als PDF *und* wie du ihn in PPTX haben willst (Screenshot reicht)

Dann mappen wir Placeholder-Namen und starten Phase **1b** direkt mit deinem Look — statt generischem MSQDX-Code-Master.
