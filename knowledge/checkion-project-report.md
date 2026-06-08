/**
 * Project executive report — architecture, APIs, evidence IDs.
 * Closes the GEO-PDF gap at project level (see checkion-geo-geo-eeat-intensive-scan.md).
 */

# CHECKION Projekt-Report

**Stand:** Executive + **Comprehensive** Variant (Bundle v2.0, Multi-Agent, Progress, Deep Collector).

## Ziel

Aus **einem Projekt** alle relevanten Daten aggregieren, optional per LLM interpretieren, und als **Executive PDF** exportieren — nicht als Dashboard-Screenshot.

## Architektur (4 Schichten)

1. **Collector** — [`lib/project-report/collector.ts`](../lib/project-report/collector.ts): deterministische Fakten aus DB/APIs
2. **Deep Collector** — [`lib/project-report/collector-deep.ts`](../lib/project-report/collector-deep.ts): GEO-Fragen-Historie, Keyword-Positionen (90 Tage), Issue-Gruppen, SEO-Rollup, KPI-Metriken, **Competitive Benchmark** ([`competitive-analysis.ts`](../lib/project-report/competitive-analysis.ts)), **GEO Deep** ([`geo-deep-analysis.ts`](../lib/project-report/geo-deep-analysis.ts): LLM-Modell-Benchmark, Einzelfragen pro Modell, On-Page E-E-A-T inkl. Reasoning)
3. **Agent (executive)** — [`lib/project-report/agent-pipeline.ts`](../lib/project-report/agent-pipeline.ts): eine OpenAI-Synthese
4. **Multi-Agent (comprehensive)** — [`lib/project-report/multi-agent-pipeline.ts`](../lib/project-report/multi-agent-pipeline.ts): Spezialisten (Site Quality, SEO, GEO, Wettbewerb, Journey) + Synthesizer
5. **Charts** — [`lib/project-report/chart-specs.ts`](../lib/project-report/chart-specs.ts) + [`components/pdf/charts/`](../components/pdf/charts/)
6. **PDF** — [`components/pdf/ProjectReportDocument.tsx`](../components/pdf/ProjectReportDocument.tsx) + [`ProjectReportDeepSections.tsx`](../components/pdf/ProjectReportDeepSections.tsx)

Async Job: [`lib/project-report/run-job.ts`](../lib/project-report/run-job.ts) — Executive **120s**, Comprehensive **900s (15 min)**; Fortschritt in `project_report_runs.progress` (Migration `0027`).

## Varianten

| Variant | Dauer | LLM | PDF |
|---------|-------|-----|-----|
| `executive` | ~1–2 min | 1 Call | ~8 Seiten |
| `comprehensive` | ~5–15 min | 5–6 Calls (Multi-Agent) | 15+ Seiten, KPI-Tabelle, Findings, Sektionsanalysen |
| `full` | ~2–3 min | 1 Call | Executive + Deep-Daten im Anhang (ohne Multi-Agent) |

## API-Pfade (siehe `lib/constants.ts`)

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/projects/[id]/report` | POST | Report-Job starten |
| `/api/projects/[id]/report` | GET | Letzte 10 Runs (Historie) |
| `/api/projects/[id]/report/[runId]` | GET | Status + Bundle |

Konstanten: `apiProjectReport(id)`, `apiProjectReportRun(projectId, runId)`, `pathProjectReport(id)`.

## Bundle-Schema

Version `1.0` (executive) / `2.0` (full/comprehensive) — Typ [`ProjectReportBundle`](../lib/project-report/types.ts):

- `project`, `domain`, `competitors`, `rankings`, `geo`, `rankTrends`, `journey`
- `audience` (comprehensive, optional): AUDION personas + fit matrix when `AUDION_API_*` configured and project linked via `checkion_project_id` in AUDION
- `visuals`, `narrative`, `provenance`, `freshness`, `links`
- `deep` (optional): `metrics`, `sections`, `geoQuestionHistory`, `geoPages`, `rankKeywordDetails`, `issueGroups`, `seoRollup`

## Evidence-ID-Konvention

Stabile IDs für Agent-QA und PDF-Fußnoten:

- `ev-wcag-score`, `ev-seo-score`, `ev-domain-score`, `ev-ranking-score`, `ev-geo-score`
- `ev-systemic-{n}`, `ev-competitor-wcag-{domain-slug}`, `ev-geo-comp-{domain-slug}`
- `ev-keyword-{id8}`

## LLM-Fallback

Ohne `OPENAI_API_KEY` oder bei Fehler: Report mit Fakten + Platzhalter-Text, PDF weiterhin generierbar (`narrative.synthesisAvailable: false`).

## UI

- Projekt-Overview: [`components/projects/ProjectReportExport.tsx`](../components/projects/ProjectReportExport.tsx)
- Historie: [`app/projects/[id]/report/page.tsx`](../app/projects/[id]/report/page.tsx)

## DB

Tabelle `project_report_runs` — Migrationen `0026` (Runs), `0027` (`progress` JSONB).

## PDF fonts

- Built-in **Helvetica** via [`lib/paths/pdf-fonts.ts`](../lib/paths/pdf-fonts.ts) (react-pdf standard fonts — reliable glyph coverage, no custom embed).

## Abgrenzung

- **Single-Scan PDF:** [`components/pdf/ScanReportDocument.tsx`](../components/pdf/ScanReportDocument.tsx) — eine URL
- **Projekt-Report:** aggregiert Deep Scan, Rankings, GEO, Wettbewerber
- **AUDION Audience Layer:** [`lib/project-report/audience-alignment.ts`](../lib/project-report/audience-alignment.ts), [`lib/integrations/audion-audience-client.ts`](../lib/integrations/audion-audience-client.ts), PDF [`ProjectReportAudienceSections.tsx`](../components/pdf/ProjectReportAudienceSections.tsx)
- **GEO Einzel-PDF:** weiterhin nicht auf Run-Ebene; Projekt-Report enthält GEO-Sektion

### AUDION integration (comprehensive)

| Env (CHECKION) | Env (AUDION) | Beschreibung |
|----------------|--------------|--------------|
| `AUDION_API_BASE_URL` | — | Persona-API origin (no trailing slash) |
| `AUDION_SERVICE_TOKEN` | `CHECKION_INBOUND_SERVICE_TOKEN` | Shared secret for server-to-server |
| — | `checkion_project_id` on AUDION project **or** shared `platform_project_id` | Links AUDION ↔ CHECKION |
| CHECKION UI | `components/projects/ProjectAudionLink.tsx` | Status + manual AUDION project picker |

Endpoint: `GET /integrations/checkion/projects/{checkionProjectId}/audience-report`

## Tests

- `__tests__/lib/project-report-collector.test.ts`
- `__tests__/lib/project-report-narrative-schema.test.ts`
- `__tests__/lib/project-report-agent-qa.test.ts`
- `__tests__/lib/project-report-chart-specs.test.ts`
- `__tests__/lib/project-report-metrics-builder.test.ts`
- `__tests__/lib/project-report-progress.test.ts`
- `__tests__/api/project-report-route.test.ts`
