# Standalone-WCAG: smarter Abgleich (Cross-User Reuse)

## Ziel

Wenn **User B** dieselbe Seite mit **gleichen Einstellungen** scannt wie **User A** kürzlich schon, wird **kein zweites Puppeteer-Run** und **keine duplizierten `scans.result`-JSONBs** angelegt. Stattdessen:

- eine Zeile in **`standalone_scan_entitlements`** (User B + optional `project_id` + Referenz auf Session/Desktop-Scan),
- **Lesen** der kanonischen Daten über dieselben APIs wie eigene Scans (`GET /api/scan/[id]`, Dashboard-Liste).

## Matching

- Normalisierte URL (`normalizeScanUrl`: Origin + Pfad ohne trailing slash)
- `standard`, `runners` (Reihenfolge egal, siehe `stableRunnersKey`), `targetRegion`
- **Geräte-Set** muss exakt passen (`resolveStandaloneScanDevices`)
- Session muss **jünger** sein als `STANDALONE_SCAN_REUSE_MAX_AGE_HOURS` (Default **168** = 7 Tage)
- Nur **fremde** Nutzer (`scan_sessions.user_id !==` aktueller User); gleicher User löst kein „Reuse“ aus (neuer Lauf bleibt möglich).

## Konfiguration (Env)

| Variable | Bedeutung |
|----------|-----------|
| `DISABLE_STANDALONE_SCAN_REUSE` | `1` / `true` → Feature aus |
| `STANDALONE_SCAN_REUSE_MAX_AGE_HOURS` | 1–8760, Default 168 |

Siehe `getStandaloneScanReuseMaxAgeHours` / `ENV_DISABLE_STANDALONE_SCAN_REUSE` in `lib/constants.ts`.

## Relevante Dateien

- `lib/db/migrations/0018_standalone_scan_entitlements.sql`, `lib/db/schema.ts`
- `lib/standalone-scan-reuse.ts` — `tryReuseStandaloneScan`
- `app/api/scan/route.ts` — Aufruf vor Puppeteer
- `lib/db/scans.ts` — `getScan`, `getScanWithSummary`, Listen-Merge, `listScansByGroupId`, Projekt-Update, Delete

## Hinweise

- **Projekt-Zuordnung** für Borrower: `standalone_scan_entitlements.project_id` (nicht die kanonische `scans.project_id` des Owners).
- **Liste / Pagination**: Zusammenführung owned + borrowed im Speicher (Cap je Quelle), bei sehr großen Historien ggf. später SQL-UNION.
- **Löschen** für Borrower: nur Entitlement; kanonische Zeilen bleiben beim Owner.
