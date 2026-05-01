# Single-page scans (structure)

## Persisted shape

- `ScanResult` in `scans.result` (JSONB) carries optional **`scanSchemaVersion`** (see `SCAN_RESULT_LATEST_SCHEMA_VERSION` in [`lib/scan-result-shape.ts`](../lib/scan-result-shape.ts)). Legacy rows omit it.
- **`passes`** are normalized to the typed **`Pass[]`** from axe rule passes before insert.
- [`runScan`](../lib/scanner.ts) returns `normalizeScanResultForPersist(result)`.

## Write path

- [`insertScanSession`](../lib/db/scans.ts) + [`persistStandaloneScanRow`](../lib/db/scans.ts) for **POST /api/scan** (one session id = batch `groupId`, three device rows with `scan_session_id` set).
- [`addScan`](../lib/db/scans.ts) normalizes JSON and fills **index columns** on `scans`: `result_schema_version`, `errors_count`, `warnings_count`, `notices_count`, `duration_ms`, `score`.
- Domain crawl pages use **`addScan`** without `scanSessionId` (null); index columns still populated.

## Standalone list

- [`listStandaloneScanSummaries`](../lib/db/scans.ts) / [`listStandaloneScansFull`](../lib/db/scans.ts): gleiche WHERE-Logik — **`group_id` is not a `domain_scans.id`**, **one row per batch** bei Liste (`device = 'desktop'`). Summaries = nur Tabellen-Spalten + Join `scan_sessions` (`target_region`); Full = JSONB `result` (z. B. Suche).
- **GET /api/scan?groupId=** — alle Geräte einer Session (`listScansByGroupId`), volle `ScanResult`-Zeilen für Geräte-Tabs.

### Tags & Filter (Standalone)

- Spalte **`scans.tags`** (JSONB, Migration **0017**): gleiche Rolle wie **`domain_scans.tags`** — normalisierte Filter-Tags; bei Projekt-Link werden sie aus **`projects.tags`** befüllt (`POST /api/scan`, **`updateScanProject`**). Aggregierte Liste/Suche: **`scan.tags ∪ project.tags`** via Join (`buildStandaloneScanSummaryWhere`).
- **`PATCH /api/scans/[id]/tags`** (`apiScansTags`) — alle Geräte einer Session (gemeinsames `group_id`) werden mitgeschrieben.
- Admin **`POST /api/admin/domain-scans/sync-project-tags`** synchronisiert jetzt **Domain- und Standalone**-Zeilen (`syncStandaloneScansTagsFromProjects`); Script **`scripts/sync-domain-scan-tags-from-projects.ts`** ebenfalls.
- Nach Auto-Tags aus Deep-/Single-Scan: **`syncStandaloneScansTagsForProjectId`** + **`invalidateScansList`** (`lib/project-industry-auto.ts`).

## Migration

- `lib/db/migrations/0015_scan_sessions_and_scan_index.sql`: `scan_sessions` + new `scans` columns.
