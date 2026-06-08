# CHECKION ↔ AUDION audience report bridge

**Stand:** Comprehensive project report pulls personas from AUDION when linked.

## Flow

1. AUDION project has `checkion_project_id` = CHECKION project UUID.
2. CHECKION comprehensive report calls `GET {AUDION}/integrations/checkion/projects/{id}/audience-report`.
3. CHECKION aligns personas (pain points, goals) with site metrics (WCAG, SEO, GEO, topics, rankings, performance).
4. PDF chapter **06 — Zielgruppen & Personas (AUDION)** when data available.

## CHECKION

- Paths: `lib/paths/audion-api.ts`
- Client: `lib/integrations/audion-audience-client.ts`
- Alignment: `lib/project-report/audience-alignment.ts`
- Collector: `lib/project-report/collector-audience.ts` (wired in `build-bundle.ts` for `comprehensive` only)

Env:

```
AUDION_API_BASE_URL=https://audion.example.com
AUDION_SERVICE_TOKEN=<shared-secret>
```

## AUDION

- Export: `apps/api/app/services/audience_report_export.py`
- Route: `apps/api/app/routers/integrations_checkion_audience.py`

Env:

```
CHECKION_INBOUND_SERVICE_TOKEN=<same-shared-secret>
```

## Persona fit pillars

| Pillar | CHECKION source |
|--------|-----------------|
| WCAG | `domain.wcagScore` |
| SEO | `domain.seoOnPageScore` |
| GEO | `geo.score` |
| Rankings | `rankings.score` |
| Performance | `domain.performance.avgLcp` |
| Topics | token overlap persona ↔ `pageClassification.topThemes` |

GEO questions matched to persona via token overlap on `deep.geoDeep.questionDetails`.
