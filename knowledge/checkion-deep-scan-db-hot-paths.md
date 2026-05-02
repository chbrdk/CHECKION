# Deep Scan: DB-Hot-Paths & Skalierung

## Speicher-Modell (Kurz)

| Ort | Inhalt | Größe |
|-----|--------|--------|
| `scans.result` | Volles `ScanResult` pro Seite (inkl. Screenshot-Data-URL) | sehr groß pro Zeile |
| `domain_scans.payload` | Domain-Übersicht: `aggregated` (gekappt) + optional leere `pages` | moderat |
| `domain_pages` + Issue-Tabellen | Seiten-Metadaten / Issues ohne Voll-`ScanResult` | für Listen gedacht |

Die Domain-UI lädt primär **`GET .../bundle`** (Light-Aggregate, keine großen Arrays) und paginierte Endpoints (`slim-pages`, `seo-pages`) — siehe `checkion-domain-scan-storage.md`.

## Wo viele volle JSONBs auf einmal geladen werden

### 1. `listScansByGroupId` (`scans.result` für alle Zeilen mit `group_id`)

- **Nutzer:** `GET /api/scan?groupId=` (Multi-Device-Vergleich) — **braucht weiterhin volles JSON** (Screenshots für UI).
- **Intern:** Aggregation, Suche, Journey, Klassifikation — **keine Screenshots nötig**.

**Hebel:** `listScansByGroupIdOmitImageBlobs` in `lib/db/scans.ts` — entfernt in PostgreSQL per `jsonb - 'screenshot' - 'saliencyHeatmap' - 'passes'` **vor** Transfer/Parsing. Nutzung für: Suche, `refreshDomainPayloadFromScans`, Page-Classification-Job, Journey, Issues-Backfill, `POST …/classify`. (`passes` = oft große Axe-Pass-Listen; Aggregation nutzt nur `issues`.)

### 2. `listStandaloneScansFull`

- **Nutzer:** `GET /api/search` (Einzelscan-Zweig), bis zu `MAX_SINGLE_LOAD` Zeilen.
- **Hebel:** dieselbe SQL-Stripping-Expression (ohne Screenshot, Heatmap, `passes`).

### 3. `listDomainScans` / `listCachedDomainScans`

- Lädt **vollen** `domain_scans.payload` pro Zeile (Kommentar in `lib/cache.ts`: kann >2 MB werden).
- **Listen/Suche:** `listDomainScanSummariesForSearch` — nur Projektion/Flags, **kein** volles Payload.

**Hebel (konzeptionell):** Dashboard-Features auf Summary-APIs umstellen; `listCachedDomainScans` nur wo wirklich nötig.

### 4. `getDomainScan` / `getDomainScanWithProjectId`

- Volles Domain-Payload — für Bundle/Detail ok (ein Scan).
- Nicht in Schleifen über „alle Domain-Scans“ verwenden.

### 4. `getLatestScanForUrlFingerprint` (Deep-Scan HEAD-Reuse)

- Lädt zuerst nur **Projektionen** (`url`, `documentCacheHints`, `id`, `project_id`) für die letzten 200 Zeilen — **nicht** 200× volles JSON.
- Bei Treffer: **ein** `getScan(id)` für das vollständige `ScanResult` (Reuse-Clone braucht alle Felder).

## Nächste Stufen (nicht umgesetzt)

- **Screenshots** aus `scans` in Object Storage; in DB nur Key/URL.
- **`passes`-Array** bei Bulk-Reads strippen (groß), wenn kein Consumer mehr `passes` braucht.
- **Partitionierung / Archiv** alter `scans`-Zeilen.

## Siehe auch

- `knowledge/checkion-domain-scan-storage.md`
- `lib/db/scans.ts` — `scanResultWithoutImageBlobs`, `listScansByGroupIdOmitImageBlobs`
