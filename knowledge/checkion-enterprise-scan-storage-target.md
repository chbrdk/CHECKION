# Zielbild: Enterprise-taugliche Scan-Speicherung (CHECKION)

Konzeptuelle Architektur und **Betrieb ohne verwaltetes AWS-S3** (z. B. **Coolify**). Implementierungsdetails für Blobs: **`lib/screenshot-storage.ts`** (bereits vorhanden).

## Prinzipien

1. **OLTP (Postgres):** Schnelle, vorhersagbare Lese-/Schreibpfade; keine unnötig großen JSON-Zeilen.
2. **Artefakt vs. Index:** Vollständiges Scan-Ergebnis bleibt **rekonstruierbar**; Listen/Filter nutzen **Spalten + schlanke APIs** (siehe Domain-Bundle).
3. **Große Binärdaten nicht im JSONB:** Screenshots liegen in **Dateisystem (Volume)** oder **S3-kompatibel**; im `ScanResult` steht nur eine **kurze Referenz** (API-Pfad). Neue Scans schreiben bereits über `writeScreenshot()` — typischerweise **`/api/scan/{id}/screenshot`**, nicht Base64 in der DB.
4. **Hybrid:** JSON für schnell evolvierende Strukturen; relationale Projektionen wo ihr **joint und zählt**.

## Blob-Speicher: kein Cloud-S3 nötig (Coolify & Co.)

CHECKION kennt **`SCREENSHOT_STORAGE`** (`lib/constants.ts`: `ENV_SCREENSHOT_STORAGE`):

| Modus | Wann | Konfiguration |
|--------|------|----------------|
| **`local`** (Default) | Eine Instanz oder **gemeinsames Volume** für alle Replicas | `SCAN_SCREENSHOTS_PATH` = Verzeichnis auf **persistentem Volume** (Coolify: Volume mount, z. B. Container-Pfad `/data/screenshots`). |
| **`s3`** | Externes oder selbst gehostetes S3-API | Bucket + Region + Credentials — **optional**, nicht Voraussetzung. |

**Coolify (ohne AWS):**

1. **Persistent Volume** an die App hängen (z. B. Host `./scan-assets` → Container `/data/screenshots`).
2. Env setzen: `SCAN_SCREENSHOTS_PATH=/data/screenshots` (Pfad muss zum Mount passen).
3. `SCREENSHOT_STORAGE` weglassen oder `local` — siehe `lib/screenshot-storage.ts`.

**Mehrere App-Container / horizontale Skalierung:** Lokale Platte ist **pro Container** — ohne gemeinsames Filesystem sehen andere Instanzen die Datei nicht. Optionen dann:

- **Ein Replica** für Scanner/API, oder
- **NFS / geteiltes Volume** in Coolify (wenn verfügbar), oder
- **MinIO** (S3-kompatibel) als **eigener Service** im Stack → `SCREENSHOT_STORAGE=s3` mit Endpoint des MinIO — **nicht** „AWS“, aber gleiche Code-Pfade.

## Ziel-Zustand (Schichten)

### A. Tabelle `scans`

| Bereich | Inhalt |
|--------|--------|
| **Spalten** | Bereits u. a. `score`, `errors_count`, … — für Listen ohne JSON. |
| **JSON `result`** | Klein halten: Screenshot als **URL-String** (bereits Scanner-Verhalten); Legacy-Zeilen können noch `data:image/...` enthalten (Backfill optional). |

### B. „Object Storage“ im weiteren Sinn

- **Lokal auf Volume** = gleiche Rolle wie S3 für „Blob nicht in Postgres“, nur ohne Cloud.
- Optional später: MinIO für S3-API auf eigener Infrastruktur.

### C. Kind-Tabellen (optional)

| Tabelle | Zweck |
|---------|--------|
| `scan_issues` | **Umgesetzt** — Issues pro `scans`-Zeile (parallel zu JSON); siehe `knowledge/checkion-scan-issues-table.md`. |
| `domain_pages` / `domain_page_issues` | Deep-Scan-Domain-UI (unverändert). |

### D. Analytics / Warehouse

- Optional; Produkt-DB nicht für schwere BI-Queries über Roh-JSON.

### E. Domain-Scans

- Wie in `checkion-domain-scan-storage.md`: gekapptes `aggregated`, `pages` leer wenn `domain_pages` gefüllt.

## API-Verhalten

- Screenshot-Auslieferung: **`GET /api/scan/[id]/screenshot`** liest aus Storage-Backend (`readScreenshot`).
- Bulk-Reads ohne Blobs/Pässe: **`listScansByGroupIdOmitImageBlobs`** (strip: Screenshot, Heatmap, Axe-`passes`) — siehe `checkion-deep-scan-db-hot-paths.md`.

## Migrationsphasen (ohne AWS)

1. **Coolify:** Volume + `SCAN_SCREENSHOTS_PATH` setzen; sicherstellen, dass neue Scans **nicht** mehr Base64 in JSON landen (bereits Standardpfad über `writeScreenshot`).
2. **Legacy:** Optional Job: alte `result.screenshot` Base64 → Datei schreiben, Feld auf URL ersetzen.
3. **Optional:** Issues normalisieren, wenn Reporting es verlangt.

## Risiken

- **Multi-Instance + nur lokaler Disk:** Screenshots nur auf dem einen Host, der geschrieben hat — siehe oben (Volume / MinIO / ein Replica).
- **Backups:** Volume **mit** sichern (Coolify-Backup oder Filesystem-Snapshot).

## Bezug zum aktuellen Code

- `lib/screenshot-storage.ts` — `local` vs `s3`
- `lib/constants.ts` — `ENV_SCREENSHOT_STORAGE`, `ENV_SCAN_SCREENSHOTS_PATH`, …
- `lib/db/scans.ts` — Bulk-Strips für große Lesepfade
- `knowledge/checkion-domain-scan-storage.md`, `knowledge/checkion-deep-scan-db-hot-paths.md`
