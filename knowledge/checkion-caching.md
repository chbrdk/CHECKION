# CHECKION – Server-side Caching (DB-Abfragen reduzieren)

## Übersicht

Um Datenbankabfragen zu reduzieren, nutzt CHECKION **Next.js `unstable_cache`** mit **Tag-basierter Invalidierung**. Gecacht werden nur **Lese-Operationen**; nach Schreib- oder Lösch-Aktionen wird der betroffene Cache per `revalidateTag` invalidiert.

- **Konstanten:** `lib/constants.ts` – `CACHE_REVALIDATE_*` (Sekunden).
- **Cache-Layer:** `lib/cache.ts` – gecachte Getter und `invalidate*`-Hilfen.

## Gecachte Daten

| Daten | Getter | Tags | Revalidate |
|-------|--------|------|------------|
| Einzelscan | `getCachedScan`, `getCachedScanWithSummary` | `scan-${id}` | 60 s |
| Domain-Scan | `getCachedDomainScan` | `domain-${id}` | 60 s |
| Share-Link | `getCachedShareByToken` | `share-${token}` | 300 s |
| Liste Einzelscans | `listCachedStandaloneScans`, `getCachedStandaloneScansCount` | `scans-list-${userId}` | 30 s |
| Liste Domain-Scans | `listCachedDomainScans`, `getCachedDomainScansCount` | `domain-list-${userId}` | 30 s |
| Saved Journeys | `listCachedSavedJourneys`, `getCachedSavedJourneysCount` | `journeys-${userId}`, optional `journeys-${userId}-${domainScanId}` | 30 s |

## Invalidierung (nach Mutation aufrufen)

- **Scan:** `invalidateScan(id)` + ggf. `invalidateScansList(userId)` (z. B. nach DELETE Scan).
- **Domain-Scan:** `invalidateDomainScan(id)` und bei Listenänderung `invalidateDomainList(userId)`.
- **Share:** `invalidateShare(token)` (z. B. nach DELETE Share).
- **Journeys:** `invalidateJourneys(userId, domainScanId?)` nach Add/Delete Journey.

API-Routen, die schreiben/löschen, rufen die passenden `invalidate*`-Funktionen aus `@/lib/cache` auf.

## Wo Cache genutzt wird

- **GET** `/api/scan`, `/api/scans/domain`, `/api/journeys` → gecachte Listen/Counts.
- **GET** `/api/scan/[id]`, `/api/scan/domain/[id]/summary` → gecachte Einzelabfragen.
- **GET** `/api/scan/domain/[id]/status` → **kein Cache**: liefert nur Status/Progress (slim), direkte DB-Abfrage. Vermeidet „items over 2MB can not be cached“ bei großen Domain-Scans beim Polling.
- **GET** `/api/share/[token]`, `/api/share/[token]/pages/[pageId]` → gecachte Share- und Domain-Daten.

Mutationen (POST/PATCH/DELETE) bleiben in `lib/db/*` und triggern danach die zugehörige Invalidierung.

**Next.js Cache-Limit:** `unstable_cache` speichert nur Einträge ≤ 2 MB. Sehr große Domain-Scans (viele Seiten + Aggregation) können dieses Limit überschreiten; dann erscheint „items over 2MB can not be cached“. Die Status-Route umgeht das durch schlanke Antwort ohne Cache. Summary/Detail nutzen weiterhin `getCachedDomainScan`; bei > 2 MB schlägt nur das Speichern im Cache fehl, die Antwort wird trotzdem geliefert.

---

## Weitere Optimierungen (Performance)

### Frontend (Domain-Seite)

- **Code-Splitting:** `DomainGraph`, `DomainAggregatedIssueList` und `JourneyFlowchart` werden auf der Domain-Ergebnisseite per `next/dynamic` mit `ssr: false` nachgeladen. Sie erscheinen nur in bestimmten Tabs; der initiale JS-Bundle wird kleiner, der Long Task beim ersten Load reduziert.

### Search-API

- **Cached Listen:** Die Suche nutzt `listCachedStandaloneScans` und `listCachedDomainScans` statt direkter DB-Abfragen.
- **Gecachte Suchergebnisse:** Das Ergebnis von `GET /api/search` wird pro (userId, q, typeFilter, limit) mit `unstable_cache` und Tags `scans-list-${userId}`, `domain-list-${userId}` gecacht (Revalidate wie Listen). Wiederholte gleiche Suchanfragen treffen nicht erneut die DB.

### Results-Seite (Einzelscan)

- **Code-Splitting:** Schwere View-Mode-Komponenten (UxIssueList, FocusOrderOverlay, StructureMap, PageIndexCard, PageIndexRegionsOverlay, TouchTargetOverlay, SaliencyHeatmapOverlay, SeoCard, LinkAuditCard, InfraCard, PrivacyCard, SecurityCard, TechnicalInsightsCard, GenerativeOptimizerCard) werden per `next/dynamic` mit `ssr: false` nachgeladen; sie laden nur beim Öffnen des jeweiligen Tabs. EcoCard, PerformanceCard, UxCard und ScanIssueList bleiben statisch.

### Bundle-Analyzer

- **Script:** `npm run analyze` (ANALYZE=true, Webpack-Build). Report in `.next/analyze/`; `openAnalyzer: false` in next.config.mjs. Zweck: große Chunks und Duplikate finden.
