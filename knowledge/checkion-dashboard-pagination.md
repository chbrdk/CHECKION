# Dashboard – Scan-Liste Limit & Pagination

## API

- Das Dashboard nutzt heute zwei getrennte Listen-APIs:
  - **GET `/api/scan`** fuer paginierte Single-Page-Scan-Summaries
  - **GET `/api/scans/domain`** fuer paginierte Domain-Scan-Summaries
- Query-Parameter:
  - `limit` – Eintraege pro Liste (Standard: **10**, Max: 100) fuer beide Endpoints
  - `page` – aktuelle Seite je Endpoint (1-basiert)
  - `projectId` – fehlt = alle zugaenglichen Eintraege, leer = nur unzugeordnet, UUID = genau dieses Projekt
  - bei `/api/scans/domain` zusaetzlich: `q`, `status`, `industry`, `tag`

- Response enthält:
  - `data` – die aktuelle Seite
  - `pagination`: mindestens `total`, `page`, `limit`, `totalPages`

## Frontend (Dashboard)

- Aufruf mit **Limit 10** und getrennten Seiten für Single- und Domain-Scans, z. B.:
  - `GET /api/scan?limit=10&page=1`
  - `GET /api/scans/domain?limit=10&page=1`
- Pagination-UI: Pro Liste (Single / Domain) getrennte Seitenstaende fuehren und jeweils nur den passenden Endpoint neu laden.
- Pfade und Default-Limit nicht hardcoden; `apiScanList()`, `apiScansDomainList()` und `DASHBOARD_SCANS_PAGE_SIZE` aus `@/lib/constants` verwenden.

## Legacy Endpoint

- **GET `/api/scans`** ist kein Dashboard-Pagination-Endpoint mehr.
- Der Endpoint liefert eine rohe Standalone-Scan-Historie und spiegelt inzwischen auch owner-backed Shared-Project-Scans wider.
- Fuer UI-Listen im Dashboard weiterhin `/api/scan` und `/api/scans/domain` verwenden.
