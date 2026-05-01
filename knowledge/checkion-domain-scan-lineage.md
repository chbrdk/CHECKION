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

### Docker / Coolify (ohne npm auf dem Host)

Das Image enthält das Script. Im **Entrypoint** (`scripts/docker-entrypoint.sh`) läuft es optional **nach** `drizzle-kit push` und **vor** `npm run start`:

| Env | Bedeutung |
|-----|-----------|
| `CHECKION_BACKFILL_DOMAIN_SCAN_LINEAGE_ON_START=1` | Backfill einmalig nach Deploy ausführen |
| `0` / leer / weglassen | Kein Backfill |

**Empfehlung:** Nach dem ersten Deploy mit Lineage-Spalten die Variable setzen, einen Neustart abwarten, danach wieder entfernen oder auf `0` — der Lauf ist idempotent, aber bei vielen Zeilen unnötig bei jedem Container-Start.

Manuell im laufenden Container:

```sh
docker exec -it <container> npx tsx scripts/backfill-domain-scan-lineage.ts
```

`Dockerfile` kopiert `scripts/backfill-domain-scan-lineage.ts` ins Runner-Image.

Optional: SQL `lib/db/migrations/0013_domain_scan_lineage.sql` für leere Datenbanken / manuelle Migration.

## API

`GET /api/scans/domain` liefert pro Eintrag `lineageVersion` (Kopf-Version).
