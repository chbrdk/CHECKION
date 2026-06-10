# CHECKION ↔ ECHON Integration

**ECHON Dashboard:** https://echon.projects-a.plygrnd.tech/echon/dashboard

ECHON hat **kein Projekt-Modell**. Der **Comprehensive Report** startet **einen ECHON-Research-Lauf pro Report** — die Frage wird aus **AUDION-Personas** (oder CHECKION-Setup-Zielgruppen) gebaut.

## Ablauf (Comprehensive Report)

```
AUDION Personas laden
    ↓
buildEchonReportResearchQuery(personas, domain, industry, competitors)
    ↓
POST /api/v2/research/threads  → thread_id
POST /api/v2/research/threads/{id}/messages  (background, research_depth: fast)
    ↓  alle 10s
GET  /api/v2/research/threads/{id}  (poll bis executive_summary da)
    ↓
bundle.marketContext → Synthesizer + Competitive + Persona-Agents
```

**Ein** ECHON-Lauf pro Report (nicht N× pro Persona — zu langsam/teuer). Die Query fasst bis zu 5 Personas mit Pain Points & Zielen zusammen.

## Konfiguration (im Code)

API-URL, Dashboard, Research-Depth und Timeout sind **fest im Code** — nicht über Env:

| Konstante | Wert |
|-----------|------|
| `ECHON_API_BASE_URL` | `https://echon.projects-a.plygrnd.tech/echon` |
| `ECHON_DASHBOARD_URL` | `https://echon.projects-a.plygrnd.tech/echon/dashboard` |
| `ECHON_REPORT_RESEARCH_DEPTH` | `fast` |
| `ECHON_REPORT_RESEARCH_TIMEOUT_MS` | `600000` (10 min Gesamt-Wartezeit) |
| `ECHON_REPORT_RESEARCH_POLL_INTERVAL_MS` | `10000` |
| `ECHON_REPORT_RESEARCH_POLL_REQUEST_TIMEOUT_MS` | `45000` |

Quelle: `lib/paths/echon-api.ts`

Optional per Env (nur Auth): `ECHON_SERVICE_TOKEN`

Weitere Pfade: `lib/project-report/echon-research-query.ts`

## Optional: gepinnter Thread (Fallback)

`projects.echon_research_thread_id` — nur wenn der Live-Lauf fehlschlägt, wird ein manuell gepinnter Thread geladen.

## Fehlergründe (`marketContext.reason`)

| reason | Bedeutung |
|--------|-----------|
| `echon_poll_timeout` | 10 min abgelaufen, GET /threads hatte noch keine `executive_summary` |
| `echon_fetch_timeout` | Einzelner POST/GET abgebrochen (weiterer Poll versucht es erneut) |
| `echon_no_structured_answer` | Thread da, Assistant-Antwort noch ohne Summary |

## PDF

- Kapitel **„Markt & Signale“** (nach Executive Summary, vor Site Quality) — nur wenn `marketContext.available` und Inhalt nach Dedupe
- Komponente: `components/pdf/ProjectReportMarketSection.tsx`
- Dedupe: `lib/project-report/pdf-echon-display.ts` vs. Executive Summary
