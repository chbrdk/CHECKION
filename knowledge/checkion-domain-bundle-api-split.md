# Domain-Bundle API split (Spezifikation, noch nicht implementiert)

Ziel: Ersten Byte klein halten (`aggregated` erst nach Tab-Wahl oder lazy).

## Vorschlag Endpoints

1. **`GET /api/scan/domain/[id]/shell`** (oder Query `?fields=shell`)
   - Felder: `id`, `domain`, `timestamp`, `status`, `progress`, `totalPages`, `score`, `totalSlimRows`, `projectId`, `industry`, `projectTags`, `scanTags`, `systemicIssues` (ohne `pages`-URLs), `eeat`, **kein** `aggregated`, **kein** eingebetteter Graph.
   - Cache: wie Bundle heute (`HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON`).

2. **`GET /api/scan/domain/[id]/aggregated`** oder Tab-spezifisch `?tab=links-seo`
   - Volles oder tab-gekapptes `aggregated` (analog `toLightAggregated` mit Tab-spezifischen Caps).

## Client (`DomainScanProvider`)

- React Query: Query A (shell) sofort; Query B (`aggregated`) `enabled: activeSection !== 'overview' || userOpenedTab` oder nach Idle.
- `setResult`/Invalidation: beide Keys bei `invalidateDomainScan(id)` invalidieren.

## Risiken

- Doppelte Requests, Race beim Tab-Wechsel — mit `placeholderData` / gleicher `staleTime` mildern.
- Backward compatibility: `/bundle` kann Übergangsweise Shell+Light-Aggregated bleiben bis Clients migriert sind.
