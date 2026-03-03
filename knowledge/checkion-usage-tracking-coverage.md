# CHECKION → PLEXON Usage Tracking (Tokens)

Alle Nutzungsereignisse werden in CHECKION via `reportUsage()` an PLEXON gesendet und dort in Tokens umgerechnet.

## Erfasste Events (reportUsage-Aufrufe)

| Event-Type | Route / Ort | raw_units | Token-Umrechnung (PLEXON) |
|------------|-------------|-----------|---------------------------|
| `scan_wcag` | `POST /api/scan` | `scans` | 50 × scans |
| `llm_request` / `chat` | `POST /api/scan/[id]/summarize`, `POST /api/scan/domain/[id]/summarize`, **suggest-competitors-queries** | `input_tokens`, `output_tokens` | input + 2×output |
| `scan_screenshot` | `POST /api/scan/[id]/screenshot` | `pages: 1` | 5 × pages |
| `scan_pagespeed` | `GET /api/tools/pagespeed` | `requests: 1` | 20 |
| `domain_scan` | `POST /api/scan/domain` | `pages` | 50 × pages |
| `saliency_ai` | `POST /api/saliency/generate` | ggf. input/output_tokens, sonst 100 | wie llm_request oder 100 |
| `journey_agent` | `POST /api/scan/journey-agent` (Job-Start), **POST /api/scan/domain/[id]/journey** (inkl. Stream) | `runs: 1` | 100 (Fallback) |
| `geo_eeat` | `POST /api/scan/geo-eeat` (Job-Ende) | `job: 1` | 100 (Fallback) |
| `competitive_benchmark` | `POST /api/scan/geo-eeat/[jobId]/rerun-competitive` (nach Abschluss) | `queries`, `runs` | 15 × queries |

## Nicht als eigene Events erfasst (in anderen Events enthalten)

- **GET /api/checks/pagespeed**: Proxy auf `/api/tools/pagespeed` → Nutzung wird dort gezählt.
- **runLlmStages** (E-E-A-T/GEO pro Seite): Kein eigenes reportUsage; ist im einmaligen `geo_eeat`-Report pro Job enthalten (Pauschale).
- **runCompetitiveBenchmarkMultiModel** im ersten GEO/E-E-A-T-Lauf: Kein separates Event; Teil des einen `geo_eeat`-Reports. Nur **Rerun** Competitive wird als `competitive_benchmark` gemeldet.

## PLEXON – usage-conversion.ts

- `tokensFromEvent(eventType, rawUnits)` bildet jeden Event-Typ auf Token-Anzahl ab.
- Neue Typen: Fallback `DEFAULT_UNKNOWN_TOKENS` (10), oder explizit im `switch` ergänzen.

## Zentrale Stellen

- **CHECKION**: `lib/usage-report.ts` → `reportUsage()`, URL/Secret aus Env (`PLEXON_AUTH_URL`, `PLEXON_SERVICE_SECRET`).
- **PLEXON**: `lib/usage-conversion.ts` (Token-Berechnung), API `/api/services/usage/events` (Empfang).
