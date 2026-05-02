# WCAG-Issues: Speicherorte (Single-Scan vs. Deep Scan)

Querschnittsübersicht — ergänzt [checkion-scan-issues-table.md](checkion-scan-issues-table.md) (Einzel-URL) und [checkion-domain-scan-storage.md](checkion-domain-scan-storage.md) (Domain-Payload).

## Welche Tabelle wofür?

| Speicherort | Granularität | Hauptnutzung |
|-------------|--------------|--------------|
| **`scans.result` → JSON `issues`** | Pro Zeile `scans` (eine URL / ein Gerät) | APIs (`GET /api/scan/[id]`), `getScan`, UI-Einzelergebnis |
| **`scan_issues`** | 1:1-Spiegel von `result.issues` pro `scans.id` | SQL/Reporting, `GET /api/scan/[id]/issues` ohne JSON-Parse |
| **`domain_pages`** | Eine Zeile pro URL innerhalb eines Domain-Scans | Slim-Pages, Verknüpfung `page_scan_id` → `scans` |
| **`domain_page_issues`** | Eine Zeile pro Fund pro Domain-Seite (`group_key` aus code+type+message) | Domain-UI: Issues pro Seite, Gruppierung |
| **`domain_issue_groups`** | Aggregat: gleicher `group_key` über Seiten | Domain-UI: Issue-Gruppenliste mit `page_count` |

**Kein Ersatz voneinander:** `scan_issues` ersetzt `domain_page_issues` nicht — unterschiedliche Schlüssel (`scan_id` vs. `domain_scan_id` + `domain_page_id`) und andere Abfragen (Einzel-URL vs. Domain-Gruppierung).

## Ablauf Deep-Scan `complete` (Reihenfolge)

Implementierung: [`lib/domain-scan-start.ts`](../lib/domain-scan-start.ts) (Branch `update.type === 'complete'`).

1. `fullPages` = `update.domainResult.pages` (volle `ScanResult[]` im RAM).
2. **Pro Seite:** `addScan(userId, { ...page, groupId: id }, { projectId })` → schreibt `scans` + **`scan_issues`** (Dual-Write mit JSON).
3. **`rebuildDomainIssuesFromPages`** → `domain_pages`, `domain_page_issues`, `domain_issue_groups` aus demselben `fullPages`-Array (Hot-Path: RAM stimmt mit Schritt 2 überein).
4. Aggregat bauen → `updateDomainScan` → Payload speichern.

Wenn Schritt 3 fehlschlägt: Payload kann weiterhin `pages: SlimPage[]` tragen (Fallback), siehe Domain-Storage-Doku.

## Backfill-Skripte und Policies

| Mechanismus | Datei / Einstieg | Zweck |
|-------------|------------------|--------|
| **`scan_issues` aus JSON** | `npm run scripts:backfill-scan-issues` | Bestands-`scans`: `result.issues` → Tabelle `scan_issues` (idempotent). |
| **Domain-Issue-Tabellen** | `ensureDomainIssueTablesBackfilled` in [`lib/domain-issues-backfill.ts`](../lib/domain-issues-backfill.ts) | On-Demand: wenn `domain_issue_groups` leer, lädt Gruppen-Seiten aus `scans` und ruft `rebuildDomainIssuesFromPages` auf. |

**Merge-Policy (Domain-Backfill):** Wenn für eine Seiten-`scans.id` bereits Zeilen in **`scan_issues`** existieren (z. B. nach globalem Backfill), werden diese beim Rebuild **statt** der JSON-`issues` aus dem geladenen `ScanResult` verwendet. Liegt `scan_issues` leer, bleibt die Quelle das persistierte JSON.

## Hot-Path vs. Backfill

- **Neuer Deep-Scan:** Kein zusätzlicher DB-Lesepfad für Issues — `fullPages` reicht.
- **Legacy / reparierte Daten:** Domain-Backfill kann von `scan_issues` profitieren, wenn JSON veraltet oder leer ist.

## Weiterführend

- Reporting-Beispiel-SQL: [checkion-wcag-issues-reporting-queries.md](checkion-wcag-issues-reporting-queries.md) — auch `scripts/report-wcag-storage-summary.sql` (kurze Operator-Beispiele).
- Enterprise-Zielbild: [checkion-enterprise-scan-storage-target.md](checkion-enterprise-scan-storage-target.md)
