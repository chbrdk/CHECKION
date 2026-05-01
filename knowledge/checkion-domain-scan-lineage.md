# Domain-Scan-Lineage (Versionierung)

## Zweck

Mehrere Deep Scans **dieselbe Kunde/URL** (gleicher Nutzer, gleiches Projekt, gleicher normalisierter Host) bilden eine **Lineage**. In Listen und Counts erscheint nur der **Kopf** (`max(lineage_version)`). Ältere Läufe bleiben in `domain_scans` und sind per ID weiterhin abrufbar (z. B. Vergleich, direkter Link).

## Spalten

- `lineage_key` – String aus `buildDomainScanLineageKey(userId, projectId, domain)` (`lib/domain-scan-lineage.ts`, nutzt `normalizeDomain`).
- `lineage_version` – Integer, startet bei 1, steigt pro neuem Lauf derselben Lineage.

Legacy-Zeilen ohne `lineage_key`: Abfragen nutzen `coalesce(lineage_key, id)` als Gruppenschlüssel (jede Zeile bleibt sichtbar, bis Backfill läuft).

## Insert

`createDomainScan` in `lib/db/scans.ts` setzt `lineage_key` und nächste `lineage_version` (Retry bei Unique-Konflikt). Partial Unique Index: `(lineage_key, lineage_version)` wo `lineage_key IS NOT NULL`.

## Listen / Counts / Suche

`listDomainScanSummaries`, `getDomainScansCount`, `listDomainScanSummariesForSearch`, `listDomainScans`, sowie aktive Projekt-Scans (eigene Zeilen) joinen gegen eine Subquery „pro Gruppe max(version)“.

## Backfill bestehender Daten

```bash
DATABASE_URL=… npx tsx scripts/backfill-domain-scan-lineage.ts
```

Optional: SQL `lib/db/migrations/0013_domain_scan_lineage.sql` für leere Datenbanken / manuelle Migration.

## API

`GET /api/scans/domain` liefert pro Eintrag `lineageVersion` (Kopf-Version).
