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
- **GET** `/api/scan/[id]`, `/api/scan/domain/[id]/summary`, `/api/scan/domain/[id]/status` → gecachte Einzelabfragen.
- **GET** `/api/share/[token]`, `/api/share/[token]/pages/[pageId]` → gecachte Share- und Domain-Daten.

Mutationen (POST/PATCH/DELETE) bleiben in `lib/db/*` und triggern danach die zugehörige Invalidierung.
