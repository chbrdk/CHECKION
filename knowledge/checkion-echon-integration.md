# CHECKION ↔ ECHON Integration

**ECHON Dashboard:** https://echon.projects-a.plygrnd.tech/echon/dashboard

ECHON hat **kein Projekt-Modell**. Der **Comprehensive Report** startet **einen ECHON-Research-Lauf pro Report** — die Frage wird aus **AUDION-Personas** (oder CHECKION-Setup-Zielgruppen) gebaut.

## Ablauf (Comprehensive Report)

```
AUDION Personas laden
    ↓
buildEchonReportResearchQuery(personas, domain, industry, competitors)
    ↓
POST /api/v2/research/runs  (async enqueue — kein Long-Stream, API bleibt frei)
    ↓  alle 10s
GET  /api/v2/research/threads/{id}  (poll bis executive_summary da)
    ↓
bundle.marketContext → Synthesizer + Competitive + Persona-Agents
```

**Wichtig:** Nicht `POST /threads` + `/messages` — das ist nur Sync-Chat ohne Agent-Schritte.

**Ein** ECHON-Lauf pro Report (nicht N× pro Persona — zu langsam/teuer). Die Query fasst bis zu 5 Personas mit Pain Points & Zielen zusammen.

## Konfiguration (im Code)

API-URL, Dashboard, Research-Depth und Timeout sind **fest im Code** — nicht über Env:

| Konstante | Wert |
|-----------|------|
| `ECHON_API_BASE_URL` | `https://echon.projects-a.plygrnd.tech/echon` |
| `ECHON_DASHBOARD_URL` | `https://echon.projects-a.plygrnd.tech/echon/dashboard` |
| `ECHON_REPORT_RESEARCH_DEPTH` | `fast` |
| `ECHON_REPORT_RESEARCH_TIMEOUT_MS` | `1800000` (30 min) |
| `ECHON_REPORT_RESEARCH_POLL_INTERVAL_MS` | `10000` |
| `ECHON_REPORT_RESEARCH_POLL_REQUEST_TIMEOUT_MS` | `45000` |

Quelle: `lib/paths/echon-api.ts`

Optional per Env (nur Auth): `ECHON_SERVICE_TOKEN`

Weitere Pfade: `lib/project-report/echon-research-query.ts`

## Optional: gepinnter Thread (Fallback)

`projects.echon_research_thread_id` — nur wenn der Live-Lauf fehlschlägt, wird ein manuell gepinnter Thread geladen.

## Nach Plan: Retrieval (nicht hängen — dauert)

Agent-Pipeline: **Discovery → Plan → Retrieval → Scoring → Synthesis**.

In der ECHON-UI wirkt es oft so, als stoppe es **nach Plan** — tatsächlich läuft dann **Retrieval** (Tag-/Textsuche, Relevanz-Scores für viele Signale). Das kann **5–20+ Minuten** dauern, ohne neuen abgeschlossenen Schritt in der UI.

Live-Beobispiel (Stream-Log):

```
stage.result plan
stage.started retrieval
stage.progress retrieval … Tag-Suche: 220 Treffer
stage.progress retrieval … Relevanz-Scores für 176 Signale…
→ danach oft Proxy-Timeout (~300s) wenn Infra zu kurz konfiguriert ist
```

**ECHON Infra (Coolify/Traefik):** `proxy_read_timeout` für `echon-v2-api` / Research-Stream auf **≥ 1800s** (30 min) setzen — sonst bricht die Verbindung mitten in Retrieval ab.

CHECKION wartet jetzt **30 min** (`ECHON_REPORT_RESEARCH_TIMEOUT_MS`) und pollt weiter, wenn der Stream wegen Proxy abbricht.

## Häufige Ursache: Agent startet, bricht sofort ab

Symptom in ECHON UI: Thread + User-Frage sichtbar, **keine** Agent-Schritte (Discovery hängt).

CHECKION sendet korrekt `POST /api/v2/research/stream`. Der Agent scheitert oft am **ECHON-Server**:

```
{"type":"error","message":"Error code: 401 ... Incorrect API key provided ..."}
```

**Fix (ECHON Coolify, Service `echon-v2-api`):** gültigen `OPENAI_API_KEY` setzen und Container neu starten.

Diagnose lokal: `npm run scripts:test-echon-integration -- --stream`

## Fehlergründe (`marketContext.reason`)

| reason | Bedeutung |
|--------|-----------|
| `echon_poll_timeout` | 10 min abgelaufen, keine fertige Agent-Antwort |
| `echon_stream_error` | Agent-Stream `{ type: "error" }` — oft **OpenAI 401** auf ECHON-Server (`OPENAI_API_KEY` in Coolify prüfen) |
| `echon_stream_incomplete` | Stream endete ohne `complete`-Event |
| `echon_fetch_timeout` | Einzelner POST/GET abgebrochen (weiterer Poll versucht es erneut) |
| `echon_no_structured_answer` | Thread da, Assistant-Antwort noch ohne Summary |

## PDF

- Kapitel **„Markt & Signale“** (nach Executive Summary, vor Site Quality) — nur wenn `marketContext.available` und Inhalt nach Dedupe
- Komponente: `components/pdf/ProjectReportMarketSection.tsx`
- Dedupe: `lib/project-report/pdf-echon-display.ts` vs. Executive Summary
