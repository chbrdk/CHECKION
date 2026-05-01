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

- [`listStandaloneScans`](../lib/db/scans.ts) / count: rows whose **`group_id` is not a `domain_scans.id`**, and **one row per batch** when `group_id` is set (`device = 'desktop'`). Fixes prior logic that required `group_id IS NULL` and hid POST /api/scan results.

## Migration

- `lib/db/migrations/0015_scan_sessions_and_scan_index.sql`: `scan_sessions` + new `scans` columns.
