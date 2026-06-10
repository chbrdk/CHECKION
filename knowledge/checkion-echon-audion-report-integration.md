# CHECKION Report ↔ ECHON ↔ AUDION — Integrationsarchitektur

**Stand:** Empfehlung vor Finalisierung des Comprehensive PDF.

## Aktueller Report-Stack (CHECKION)

| Schicht | Quelle | Rolle im Report |
|---------|--------|-----------------|
| Fakten | Domain-Scan, Rankings, GEO, Wettbewerber | KPIs, Tabellen, Evidence |
| Specialist Agents | `multi-agent-pipeline.ts` | On-Page, SEO, GEO, Competitive, Journey |
| Synthesizer | Executive, Findings, Maßnahmenplan | Narrativ |
| AUDION | `collector-audience.ts` + `persona-audience-agent.ts` | Personas, Fit-Pillars, persona-voice Insights (Kap. 6) |
| CHECKION Research | `POST /api/projects/[id]/research` | **Setup** (Keywords, GEO-Queries, Wettbewerber) — nur teilweise im Report (`valueProposition`, Competitors-Liste) |

Verknüpfung AUDION: `platform_project_id` oder `checkion_project_id` → siehe `knowledge/checkion-audion-audience-report.md`.

## ECHON Research (v2)

- **Dashboard:** https://echon.projects-a.plygrnd.tech/echon/dashboard
- **Kein ECHON-Projekt** — Verknüpfung nur über `echon_research_thread_id` auf CHECKION-Projekt (siehe `knowledge/checkion-echon-integration.md`).
- API: `GET /api/v2/research/threads/{id}` — strukturierte Assistant-Antwort aus Signals/Waves.
- Output: `executive_summary`, `key_findings`, `implications`, `recommended_watchlist`, `confidence`, `contradictions`, `evidence_gaps`, Citations.

## Macht Verknüpfung Sinn?

**Ja — aber als dritte Kontext-Schicht, nicht als Ersatz für SCAN oder AUDION.**

| System | Frage | Report-Rolle |
|--------|-------|--------------|
| CHECKION Scan | Wie gut ist *unsere* Site technisch/sichtbar? | Messwerte, Scoreboard |
| CHECKION Research (intern) | Was tracken / wen adressieren wir? | Keyword-/GEO-Setup, Value Prop |
| **ECHON** | Was passiert *am Markt* (Signale, Trends, Wettbewerb extern)? | **Kontext & Druck** für Exec + Competitive |
| **AUDION** | Wie erlebt das *Zielgruppe X*? | Persona-Fit auf Scan-Daten |

ECHON liefert **externe Evidenz**; AUDION **interne Nutzerperspektive** — komplementär.

## Was vermeiden

1. **ECHON-Orchestrator pro Report-Lauf** in der PDF-Pipeline (Minuten Laufzeit, teuer, redundant zum Executive).
2. **Rohe Research-Threads** 1:1 ins PDF (wieder Dopplung wie früher bei Agent-Summaries).
3. **Persona-Agent × ECHON live** (N× Retrieval-Kosten).
4. **Direktes „Agent-Merging“** — drei getrennte Spezialisten + ein Synthesizer beibehalten.

## Empfohlenes Muster (wie AUDION)

### 1. Report-gesteuertes Research (umgesetzt)

Pro Comprehensive Report **ein** ECHON-Chat (`POST /api/v2/research/chat`). Die Query kommt aus AUDION-Personas (+ Domain, Branche, Wettbewerber):

```
buildEchonReportResearchQuery → POST .../research/chat → bundle.marketContext
```

Optionaler Fallback: `echon_research_thread_id` auf CHECKION-Projekt, wenn Live-Lauf fehlschlägt.

Response intern → schlank, report-ready:

```ts
type EchonMarketContextForReport = {
  available: boolean;
  threadId?: string;
  capturedAt?: string;
  executiveSummary?: string;      // max ~400 Wörter
  keyFindings?: string[];         // max 5
  implications?: string;
  watchlist?: string[];           // max 5
  evidenceGaps?: string[];
  contradictions?: string[];
  citationCount?: number;
};
```

Quelle: **Live-Research-Lauf** im Report-Job; Personas aus AUDION (max. 5), sonst CHECKION `setup.targetGroups`.

### 2. CHECKION Collector

- `lib/integrations/echon-market-client.ts`
- `lib/paths/echon-api.ts` (zentrale URLs, wie `audion-api.ts`)
- `collector-market.ts` → `bundle.marketContext` + `provenance`

Env: `ECHON_API_BASE_URL`, `ECHON_SERVICE_TOKEN` (symmetrisch zu AUDION).

### 3. Report-Pipeline

```
collect facts → [optional] ECHON snapshot → specialist agents (Payload + slim marketContext)
→ synthesizer (Markt-Kontext nur für strategische Lücken, nicht WCAG-Zahlen wiederholen)
→ AUDION personas (marketContext als „externer Druck“ im Persona-Agent-Prompt)
```

Optional eigener **`agent_market`** (1 kurzer Absatz) oder nur Synthesizer + Competitive-Agent.

### 4. PDF (kompakt)

- Neues Unterkapitel z. B. **„Markt & Signale (ECHON)“** im Executive-Bereich **oder** vor Wettbewerb — max. 1 Seite.
- Keine Citation-Liste im PDF (nur „N Quellen“ + Link/Thread-ID in Provenance).
- Dedupe-Regeln aus `knowledge/checkion-pdf-content-dedupe.md` anwenden.

## Schneller Win vor ECHON

CHECKION-eigenes Research stärker nutzen (ohne neue Infra):

- `seoKeywords`, `geoQueries`, `targetGroups` aus Projekt-DB in SEO/GEO-Agent-Payload und Synthesizer.
- Abgleich: getrackte Keywords vs. `project.research.seoKeywords` → Lücken-Finding.

## Rollout-Phasen

| Phase | Inhalt |
|-------|--------|
| **A** | CHECKION Research → Report-Agents (nur CHECKION DB) |
| **B** | ECHON pinned-thread Export + Collector + Exec-Absatz |
| **C** | Persona-Agent mit `marketContext`; Competitive-Agent mit ECHON watchlist |
| **D** | Optional: ECHON `evidence_gaps` ↔ CHECKION GEO/SEO Findings mergen |

## Entscheidung

**Phase A (umgesetzt):** `research_snapshot`, Collector `setup`, Agents via `projectSetup`.

**Phase B (umgesetzt):** Persona-Query + `runEchonReportResearch` im Report; `marketContext` in Synthesizer, Competitive, Persona-Agents.

**Nächster Schritt:** PDF-Abschnitt „Markt & Signale“; ggf. `balanced`/`deep` per Projekt-Flag.

Pfade: dieses Dokument, `checkion-audion-audience-report.md`, `checkion-pdf-content-dedupe.md`, `lib/project-report/project-setup-context.ts`.
