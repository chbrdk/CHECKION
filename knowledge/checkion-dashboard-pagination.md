# Dashboard – Scan-Liste Limit & Pagination

## API

- **GET `/api/scans`** (siehe `lib/constants.ts`: `API_SCANS_LIST`) liefert paginierte Single- und Domain-Scans.
- Query-Parameter:
  - `limit` – Einträge pro Liste (Standard: **10**, Max: 50), aus `DASHBOARD_SCANS_PAGE_SIZE` / `SCANS_API_MAX_LIMIT`.
  - `scanPage` – Seite für Single-Page-Scans (1-basiert).
  - `domainPage` – Seite für Domain-Scans (1-basiert).

- Response enthält:
  - `scans`, `domainScans` – die aktuellen Seiten.
  - `pagination`: `limit`, `scanPage`, `domainPage`, `totalScans`, `totalDomainScans`, `totalScanPages`, `totalDomainPages`.

## Frontend (Dashboard)

- Aufruf mit **Limit 10** und getrennten Seiten für Single- und Domain-Scans, z. B.:
  `GET /api/scans?limit=10&scanPage=1&domainPage=1`
- Pagination-UI: Pro Liste (Single / Domain) „Zurück“ / „Weiter“ (oder Seitenzahlen) nutzen und `scanPage` bzw. `domainPage` beim Klick anpassen und neu laden.
- Pfade und Default-Limit nicht hardcoden; `API_SCANS_LIST` und `DASHBOARD_SCANS_PAGE_SIZE` aus `@/lib/constants` verwenden.
