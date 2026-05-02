# Tabelle `scan_issues` (Single-Scan)

## Zweck

- **Relationale** Abbildung von `ScanResult.issues` pro Zeile in `scans`.
- Ermöglicht SQL-Abfragen (Filter nach `code`, `type`, Volltext auf `message`) **ohne** `jsonb`-Parsing.
- **Kein Ersatz** für `domain_page_issues` (Deep-Scan-Domain-UI) — das bleibt unverändert.

## Schema

- Migration: `lib/db/migrations/0019_scan_issues.sql`
- Drizzle: `scanIssues` in `lib/db/schema.ts`
- **Cascade:** `ON DELETE CASCADE` von `scans.id` — Löschen des Scans entfernt die Issue-Zeilen.

## Schreibpfad

- **`addScan`** und **`updateScanResult`:** Transaktion `scans` + `replaceScanIssuesForScan` (`lib/db/scan-issues-persist.ts`).
- JSON `result.issues` bleibt **unverändert** (volle Abwärtskompatibilität für APIs, die nur JSON lesen).

## Bestandsdaten

```bash
npm run scripts:backfill-scan-issues
```

Benötigt `DATABASE_URL`. Verarbeitet alle `scans`-Zeilen in Batches (idempotent).

## Lesen

- Hilfsfunktionen: `listScanIssuesForScan(db, userId, scanId)`, `listScanIssuesForScanId(db, scanId)` (nur nach Zugriffsprüfung).
- **HTTP:** `GET /api/scan/[id]/issues` — Auth wie `GET /api/scan/[id]` (Session oder Bearer-Token); Zugriff inkl. geborgter Standalone-Scans via `getScan`. Response: `{ success, count, data: Issue[] }`.
- Pfad-Builder: `apiScanIssues(id)` in `lib/constants.ts`.
- Vollständiges Scan-JSON weiter über **`getScan`** / `GET /api/scan/[id]`.
