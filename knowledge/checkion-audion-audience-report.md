# CHECKION ↔ AUDION audience report bridge

**Stand:** Comprehensive project report pulls personas from AUDION when linked.

## Flow

1. AUDION project linked via `checkion_project_id` = CHECKION UUID **or** same `platform_project_id` (PLEXON).
2. Manual link: CHECKION project page → **AUDION-Verknüpfung** → `PUT /api/projects/{id}/audion-link`.
3. CHECKION comprehensive report calls `GET {AUDION}/integrations/checkion/projects/{id}/audience-report?platform_project_id=…`.
3. CHECKION aligns personas (pain points, goals) with site metrics (WCAG, SEO, GEO, topics, rankings, performance).
4. PDF chapter **06 — Zielgruppen & Personas (AUDION)** when data available.

## CHECKION

- Paths: `lib/paths/audion-api.ts`
- Client: `lib/integrations/audion-audience-client.ts`
- Alignment: `lib/project-report/audience-alignment.ts`
- Collector: `lib/project-report/collector-audience.ts` (wired in `build-bundle.ts` for `comprehensive` only)

Env:

```
# Public AUDION web origin + optional base path + /api (Next.js BFF proxy → internal persona-api)
AUDION_API_BASE_URL=https://audion.projects-a.plygrnd.tech/api
# When AUDION uses NEXT_PUBLIC_BASE_PATH=/audion:
# AUDION_API_BASE_URL=https://audion.projects-a.plygrnd.tech/audion/api
AUDION_SERVICE_TOKEN=<shared-secret>
```

There is **no** separate `persona-api` hostname on plygrnd. Paths like
`/integrations/checkion/...` are served at `{origin}/api/integrations/checkion/...`
via `apps/web/app/api/integrations/checkion/[[...path]]/route.ts` (Bearer token forwarded).
Do **not** use `/api/persona-backend` on this deployment — that path is not exposed.

## AUDION

- Export: `apps/api/app/services/audience_report_export.py`
- Route: `apps/api/app/routers/integrations_checkion_audience.py`

Env:

```
CHECKION_INBOUND_SERVICE_TOKEN=<same-shared-secret>
```

## Persona fit pillars

| Pillar | CHECKION source | Persona-specific? |
|--------|-----------------|-------------------|
| WCAG | `domain.wcagScore` | Yes — weighted by accessibility keywords in pain points / goals |
| SEO | `domain.seoOnPageScore` | Yes — SEO / visibility keywords |
| GEO | `geo.score` | Yes — LLM / AI-search keywords + per-persona GEO question overlap |
| Rankings | `rankings.score` | Yes — ranking / SERP keywords |
| Performance | `domain.performance.avgLcp` | Yes — speed / mobile keywords |
| Topics | token overlap persona ↔ `pageClassification.topThemes` | Yes — distinctive tokens vs other personas in the report |

### Deterministic baseline + persona agent (comprehensive reports)

1. **Deterministic layer** (`audience-alignment.ts`) — fast, salience-weighted pillar scores.
2. **Persona agent layer** (`persona-audience-agent.ts`) — one OpenAI call **per persona** (max 8, concurrency 2) after specialist section agents finish. Each agent:
   - Reads slim scan payload + persona profile + section summaries
   - Returns **6 comparable pillar scores** (0–100) with persona-specific notes
   - Returns **sub-scores** (content_relevance, findability, trust_credibility, task_clarity, accessibility_impact, discovery_geo)
   - Returns **persona-voice insights** (first-person perspective + wins/frictions)
3. Agent results **replace** deterministic pillar scores when successful; UX-journey facts from data are kept.

Progress stage: `agent_persona_audience`. Skipped when `skipLlm` or no OpenAI key.

Implementation: `lib/project-report/persona-pillar-signals.ts`, `lib/project-report/persona-audience-schema.ts`, `lib/project-report/persona-audience-agent.ts`.
