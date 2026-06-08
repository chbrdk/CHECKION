/**
 * Project executive report — architecture, APIs, evidence IDs.
 * Closes the GEO-PDF gap at project level (see checkion-geo-geo-eeat-intensive-scan.md).
 */

# CHECKION Projekt-Report

**Stand:** Implementierung Projekt-Executive-Report (Bundle + async Job + PDF + LLM-Synthese).

## Ziel

Aus **einem Projekt** alle relevanten Daten aggregieren, optional per LLM interpretieren, und als **Executive PDF** exportieren — nicht als Dashboard-Screenshot.

## Architektur (4 Schichten)

1. **Collector** — [`lib/project-report/collector.ts`](../lib/project-report/collector.ts): deterministische Fakten aus DB/APIs
2. **Agent** — [`lib/project-report/agent-pipeline.ts`](../lib/project-report/agent-pipeline.ts): OpenAI-Synthese mit Evidence-QA
3. **Charts** — [`lib/project-report/chart-specs.ts`](../lib/project-report/chart-specs.ts) + [`components/pdf/charts/`](../components/pdf/charts/)
4. **PDF** — [`components/pdf/ProjectReportDocument.tsx`](../components/pdf/ProjectReportDocument.tsx)

Async Job: [`lib/project-report/run-job.ts`](../lib/project-report/run-job.ts) (Fire-and-forget IIFE, DB-Status wie GEO/E-E-A-T).

## API-Pfade (siehe `lib/constants.ts`)

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/projects/[id]/report` | POST | Report-Job starten |
| `/api/projects/[id]/report` | GET | Letzte 10 Runs (Historie) |
| `/api/projects/[id]/report/[runId]` | GET | Status + Bundle |

Konstanten: `apiProjectReport(id)`, `apiProjectReportRun(projectId, runId)`, `pathProjectReport(id)`.

## Bundle-Schema

Version `1.0` — Typ [`ProjectReportBundle`](../lib/project-report/types.ts):

- `project`, `domain`, `competitors`, `rankings`, `geo`, `rankTrends`, `journey`
- `visuals`, `narrative`, `provenance`, `freshness`, `links`

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

Tabelle `project_report_runs` — Migration [`lib/db/migrations/0026_project_report_runs.sql`](../lib/db/migrations/0026_project_report_runs.sql).

## Abgrenzung

- **Single-Scan PDF:** [`components/pdf/ScanReportDocument.tsx`](../components/pdf/ScanReportDocument.tsx) — eine URL
- **Projekt-Report:** aggregiert Deep Scan, Rankings, GEO, Wettbewerber
- **GEO Einzel-PDF:** weiterhin nicht auf Run-Ebene; Projekt-Report enthält GEO-Sektion

## Tests

- `__tests__/lib/project-report-collector.test.ts`
- `__tests__/lib/project-report-narrative-schema.test.ts`
- `__tests__/lib/project-report-agent-qa.test.ts`
- `__tests__/lib/project-report-chart-specs.test.ts`
- `__tests__/api/project-report-route.test.ts`
