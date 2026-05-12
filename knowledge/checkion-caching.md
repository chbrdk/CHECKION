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
| Liste Einzelscans | `listCachedStandaloneScanSummaries`, `getCachedStandaloneScansCount` | `scans-list-${userId}` | 30 s |
| Liste Domain-Scans (Summaries) | `listCachedDomainScanSummaries`, `getCachedDomainScansCount` | `domain-list-${userId}` | 30 s |
| Liste Domain-Scans (voll, für Suche) | `listCachedDomainScans` | `domain-list-${userId}` | 30 s (kann >2MB sein) |
| Saved Journeys | `listCachedSavedJourneys`, `getCachedSavedJourneysCount` | `journeys-${userId}`, optional `journeys-${userId}-${domainScanId}` | 30 s |

## Invalidierung (nach Mutation aufrufen)

- **Scan:** `invalidateScan(id)` + ggf. `invalidateScansList(userId)` (z. B. nach DELETE Scan).
- **Domain-Scan:** `invalidateDomainScan(id)` und bei Listenänderung `invalidateDomainList(userId)`.
- **Share:** `invalidateShare(token)` (z. B. nach DELETE Share).
- **Journeys:** `invalidateJourneys(userId, domainScanId?)` nach Add/Delete Journey.

API-Routen, die schreiben/löschen, rufen die passenden `invalidate*`-Funktionen aus `@/lib/cache` auf.

## Wo Cache genutzt wird

- **GET** `/api/scan`, `/api/scans/domain`, `/api/journeys` → gecachte Listen/Counts.
- **GET** `/api/scan` und **GET** `/api/scans/domain` mergen bei fehlendem `projectId` viewer-eigene gecachte Listen mit Shared-Project-Zeilen. **`projectId`**: Parameter fehlt → alle zugänglichen Einträge; leerer String → nur Zeilen ohne Projekt (`project_id IS NULL`); UUID → genau dieses Projekt, bei Shared Projects owner-backed aufgelöst.
- **GET** `/api/scans/domain`: optionale Query-Parameter **`q`** (Domain-Substring, `ilike`) und **`status`** (Domain-Scan-Status); beide fließen in den `unstable_cache`-Key von `listCachedDomainScanSummaries` / `getCachedDomainScansCount`. **Wichtig:** Im Cache-Key müssen **`undefined` (alle)** und **`null` (nur ohne Projekt)** getrennt sein — dafür `domainScanListProjectCacheKey()` in `lib/cache.ts` (`all` vs. `unassigned` vs. UUID), nicht `projectId ?? 'all'`.
- **GET** `/api/scans` ist Legacy und nutzt keinen eigenen Listen-Cache; der Endpoint liefert rohe Standalone-History.
- **POST** `/api/scans/domain/compare`: kein List-Cache; zwei UUIDs im Body → schlanke Vergleichs-DTOs aus `domain_scans.payload`.
- **GET** `/api/scan/[id]`, `/api/scan/domain/[id]/summary` → gecachte Einzelabfragen.
- **GET** `/api/scan/domain/[id]/status` → **kein Cache**: liefert nur Status/Progress (slim), direkte DB-Abfrage. Vermeidet „items over 2MB can not be cached“ bei großen Domain-Scans beim Polling.
- **GET** `/api/share/[token]`, `/api/share/[token]/pages/[pageId]` → gecachte Share- und Domain-Daten.

Mutationen (POST/PATCH/DELETE) bleiben in `lib/db/*` und triggern danach die zugehörige Invalidierung.

## HTTP `Cache-Control` (Browser)

Für **authentifizierte** Domain-Read-APIs (u. a. Summary, Slim-Pages, Issue-Groups/Page-Issues, Bundle) setzen die Routen `Cache-Control: private, max-age=<CACHE_REVALIDATE_DOMAIN>, stale-while-revalidate=<CACHE_DOMAIN_JSON_STALE_WHILE_REVALIDATE>` über `HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON` in `lib/constants.ts`. Das ist ein **Hinweis für den Browser** (kurzes Wiederholen identischer GETs), **kein** öffentliches CDN-Caching (`private`). `stale-while-revalidate` ist mit dem TanStack-Query-Bundle (`staleTime` / `gcTime` in `DomainScanProvider`) grob abgestimmt.

**Next.js Cache-Limit:** `unstable_cache` speichert nur Einträge ≤ 2 MB. Sehr große Domain-Scans (viele Seiten + Aggregation) können dieses Limit überschreiten; dann erscheint „items over 2MB can not be cached“. Die Status-Route umgeht das durch schlanke Antwort ohne Cache. Summary/Detail nutzen weiterhin `getCachedDomainScan`; bei > 2 MB schlägt nur das Speichern im Cache fehl, die Antwort wird trotzdem geliefert.

---

## Weitere Optimierungen (Performance)

### Frontend (Domain-Seite)

- **Tab-Sektionen:** Alle Domain-Tabs sind als eigene `memo`-Komponenten unter `components/domain/` ausgelagert (`DomainResultMain` orchestriert nur noch `activeSection`): u. a. `DomainResultOverviewSection`, `DomainResultListDetailsSection`, `DomainResultVisualMapSection`, `DomainResultUxCxSection`, `DomainResultVisualAnalysisSection`, `DomainResultUxAuditSection` (+ `DomainResultUxAuditEmpty`), `DomainResultStructureSection` (+ Empty), `DomainResultLinksSeoSection` (+ Empty), `DomainResultInfraTab`, `DomainResultGenerativeSection` (+ Empty), `DomainResultJourneySection`. So triggern Kontext-Updates in einem Tab nicht unnötig die JSX-Auswertung der anderen.
- **Domain-Route / Rendering-Stabilität:** Tab-Sektionen in `DomainResultMain` sind **statisch importiert** (kein `next/dynamic` für diese Module). `ScannedPagesTable` (Übersicht) und `VirtualChipList` rendern **alle Zeilen/Chips im DOM** (kein TanStack-Windowing). Listen in den Domain-Tabs nutzen `VirtualScrollList` mit **`virtualize={false}`** (normales Scrollen). Trade-off: größeres initiales JS, dafür weniger Flackern beim Tab- und Listen-Scroll.

### Search-API

- **Domain-Zweig:** Lädt **keine** vollen `domain_scans.payload`-Zeilen mehr: `listDomainScanSummariesForSearch` (Metadaten + `hasStoredAggregated` per JSONB) und `listScansByGroupIdForSearch` (schmale `result`-Projektion für Volltext) bzw. bei Legacy `getDomainScan`. Einzelscan-Dashboard: **`listCachedStandaloneScanSummaries`** (relationale Spalten, kein großes JSONB); Volltext-Suche: **`listStandaloneScansFull`** (teuer).
- **Gecachte Suchergebnisse:** Das Ergebnis von `GET /api/search` wird pro (userId, q, typeFilter, limit) mit `unstable_cache` und Tags `scans-list-${userId}`, `domain-list-${userId}` gecacht (Revalidate wie Listen). Wiederholte gleiche Suchanfragen treffen nicht erneut die DB.

### Results-Seite (Einzelscan)

- **Code-Splitting:** Schwere View-Mode-Komponenten (UxIssueList, FocusOrderOverlay, StructureMap, PageIndexCard, PageIndexRegionsOverlay, TouchTargetOverlay, SaliencyHeatmapOverlay, SeoCard, LinkAuditCard, InfraCard, PrivacyCard, SecurityCard, TechnicalInsightsCard, GenerativeOptimizerCard) werden per `next/dynamic` mit `ssr: false` nachgeladen; sie laden nur beim Öffnen des jeweiligen Tabs. EcoCard, PerformanceCard, UxCard und ScanIssueList bleiben statisch.

### Bundle-Analyzer

- **Script:** `npm run analyze` (ANALYZE=true, Webpack-Build). Report in `.next/analyze/`; `openAnalyzer: false` in next.config.mjs. Zweck: große Chunks und Duplikate finden.
