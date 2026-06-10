# CHECKION ↔ ECHON Integration

**ECHON Dashboard:** https://echon.projects-a.plygrnd.tech/echon/dashboard

ECHON hat **kein Projekt-Modell**. Der **Comprehensive Report** startet **einen ECHON-Research-Lauf pro Report** — die Frage wird aus **AUDION-Personas** (oder CHECKION-Setup-Zielgruppen) gebaut.

## Ablauf (Comprehensive Report)

```
AUDION Personas laden
    ↓
buildEchonReportResearchQuery(personas, domain, industry, competitors)
    ↓
POST {ECHON_API_BASE_URL}/api/v2/research/chat   (research_depth: fast default)
    ↓
bundle.marketContext → Synthesizer + Competitive + Persona-Agents
```

**Ein** ECHON-Lauf pro Report (nicht N× pro Persona — zu langsam/teuer). Die Query fasst bis zu 5 Personas mit Pain Points & Zielen zusammen.

## Env (CHECKION Server)

```bash
ECHON_API_BASE_URL=https://echon.projects-a.plygrnd.tech/echon
ECHON_SERVICE_TOKEN=          # optional, falls Auth aktiv
ECHON_REPORT_RESEARCH_DEPTH=fast   # fast | balanced | deep
ECHON_REPORT_RESEARCH_TIMEOUT_MS=300000
```

Pfade: `lib/paths/echon-api.ts`, `lib/project-report/echon-research-query.ts`

## Optional: gepinnter Thread (Fallback)

`projects.echon_research_thread_id` — nur wenn der Live-Lauf fehlschlägt, wird ein manuell gepinnter Thread geladen.

## PDF

- Kapitel **„Markt & Signale“** (nach Executive Summary, vor Site Quality) — nur wenn `marketContext.available` und Inhalt nach Dedupe
- Komponente: `components/pdf/ProjectReportMarketSection.tsx`
- Dedupe: `lib/project-report/pdf-echon-display.ts` vs. Executive Summary
