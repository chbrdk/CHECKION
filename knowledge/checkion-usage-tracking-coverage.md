# CHECKION → PLEXON Usage Tracking (Tokens)

Alle Nutzungsereignisse werden in CHECKION via `reportUsage()` an PLEXON gesendet und dort in Tokens umgerechnet.

## Erfasste Events (reportUsage-Aufrufe)

| Event-Type | Route / Ort | raw_units | Token-Umrechnung (PLEXON) |
|------------|-------------|-----------|---------------------------|
| `scan_wcag` | `POST /api/scan` | `scans` | 50 × scans |
| `llm_request` / `chat` | `POST /api/scan/[id]/summarize`, `POST /api/scan/domain/[id]/summarize`, **suggest-competitors-queries**; **automatische Seitenklassifikation** in `lib/scanner.ts` (wenn `userId` gesetzt, z. B. Deep Scan + `POST /api/scan`); `POST /api/scan/[id]/classify`, `POST /api/scan/domain/[id]/classify` (Background) | `input_tokens`, `output_tokens` | input + 2×output (PLEXON) |
| `scan_screenshot` | `POST /api/scan/[id]/screenshot` | `pages: 1` | 5 × pages |
| `scan_pagespeed` | `GET /api/tools/pagespeed` | `requests: 1` | 20 |
| `domain_scan` | PLEXON unterstützt weiterhin Sammel-`pages`; CHECKION sendet es **nicht** mehr (nur noch `domain_scan_page`). | `pages` | 50 × pages |
| `domain_scan_page` | **Deep Scan:** jede fertiggestellte Seite (Erfolg oder Fehler), `lib/domain-scan-start.ts` | `pages: 1`, `domain_scan_id`, `page_index`, `ok`, `url`, optional `reused_unchanged: true` (HEAD-ETag/Reuse); Idempotency `domain_scan_page:{scanId}:{pageIndex}` | 50 × pages; bei Reuse **5** × pages (PLEXON) |
| `saliency_ai` | `POST /api/saliency/generate` | ggf. input/output_tokens, sonst 100 | wie llm_request oder 100 |
| `journey_agent` | `POST /api/scan/journey-agent` (Job-Start), **POST /api/scan/domain/[id]/journey** (inkl. Stream) | `runs: 1` | 100 (Fallback) |
| `geo_eeat` | `POST /api/scan/geo-eeat` (Job-Ende) | `job: 1`, optional `input_tokens` / `output_tokens` (Summe aus `runLlmStages` + erstem Competitive Multi-Model) | min. 100; mit Tokens: `max(100, input + 2×output)` (PLEXON) |
| `competitive_benchmark` | `POST /api/scan/geo-eeat/[jobId]/rerun-competitive` (nach Abschluss) | `queries`, `runs` | 15 × queries |
| `page_classify` | *(Legacy)* früher manuelle Classify-Routen; aktuell melden diese **`llm_request`** mit echten Tokens. PLEXON unterstützt `page_classify` weiter für alte Events. | `pages`, optional `input_tokens` / `output_tokens` | 40 × pages bzw. max(40×pages, input+2×output) (PLEXON) |
| `ux_check` | `POST /api/scan/[id]/ux-check` (Claude UX Check v2) | `input_tokens` / `output_tokens` oder `runs: 1` | min. 120; mit Tokens: `max(120, input + 2×output)`; ohne Usage: 120 × runs (PLEXON) |
| `serp_refresh` | `POST /api/rank-tracking/refresh` (nach erfolgreichen SERP-Aufrufen) | `keywords` (Anzahl erfolgreich aktualisierter Keywords) | 35 × keywords (PLEXON) |
| `tool_extract` | `GET /api/tools/extract` (Puppeteer, nach Erfolg) | `requests: 1` | 28 × requests; nur wenn eingeloggter User (Session/Bearer) |
| `wayback_lookup` | `GET /api/tools/wayback` (nach erfolgreicher API-Antwort) | `requests: 1` | 6 × requests; nur mit User |
| `ssl_labs_analyze` | `GET /api/tools/ssl-labs` (nach erfolgreichem HTTP zu SSL Labs) | `requests: 1` | 18 × requests; nur mit User |

## Nicht als eigene Events erfasst (in anderen Events enthalten)

- **GET /api/checks/pagespeed**: Proxy auf `/api/tools/pagespeed` → Nutzung wird dort gezählt.
- **`/api/checks/wayback`**, **`/api/checks/ssl`**: Proxys auf die gleichnamigen Tool-Routen → Zählung nur, wenn der **Client** die Checks-URL mit Auth aufruft (Cookies); serverinterner `fetch` von Checks → Tools trägt oft **keine** Session, dann kein Usage (bewusst).
- **runLlmStages** / **erster Competitive-Lauf** im GEO-Job: keine separaten Events; Token-Summen fließen in `geo_eeat` (`raw_units.input_tokens` / `output_tokens`), sofern die Provider Usage liefern. Ohne Usage bleibt Pauschale 100 Tokens pro Job.
- Nur **Rerun** Competitive wird zusätzlich als `competitive_benchmark` gemeldet.

## PLEXON – usage-conversion.ts

- `tokensFromEvent(eventType, rawUnits)` bildet jeden Event-Typ auf Token-Anzahl ab.
- Neue Typen: Fallback `DEFAULT_UNKNOWN_TOKENS` (10), oder explizit im `switch` ergänzen.

## Zentrale Stellen

- **CHECKION**: `lib/usage-report.ts` → `reportUsage()`, URL/Secret aus Env (`PLEXON_AUTH_URL`, `PLEXON_SERVICE_SECRET`).
- **PLEXON**: `lib/usage-conversion.ts` (Token-Berechnung), API `/api/services/usage/events` (Empfang).
