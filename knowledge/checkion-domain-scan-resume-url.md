# Domain Deep Scan: Status nach Seitenwechsel

## Verhalten

- Nach **POST** `/api/scan/domain` ersetzt die Live-Seite `app/scan/domain/page.tsx` die URL per `router.replace` mit **`scanId`** in den Query-Params (`pathScanDomain({ url, maxPages?, projectId?, scanId })`).
- Kehrt der Nutzer zurück (Lesezeichen, History, gleicher Tab), liest die Seite **`scanId`** aus `searchParams`, setzt **keinen** neuen Create-Request und **pollt** weiter `/api/scan/domain/[id]/status`.
- Log-Zeile: i18n-Key **`domain.resumedLog`** (DE/EN).

## Verwandte APIs

- Projekt: **GET** `/api/projects/[id]/domain-scans/active` — laufende Scans für die Übersicht.
- Pfad-Helfer: `pathScanDomain` in `lib/constants.ts` inkl. optionalem `scanId`.
- Projektseite: Button „Deep Scan öffnen“ bei aktiven Zeilen nutzt `pathScanDomain({ url: scanRootUrl, maxPages?, projectId, scanId })`, sofern `scanRootUrl` aus der Domain-Zeile ableitbar ist (`toScanStartUrl` in `lib/url-normalize.ts`); sonst Fallback `pathDomain(scanId)`.
- **Deep Scan neu starten** (`handleRestartDeepScan`): nach erfolgreichem POST navigiert `pathScanDomainResume({ domainOrUrl: project.domain, scanId, projectId })` → Live-Seite mit `scanId` (zentral in `lib/constants.ts`).

## Tests

- `__tests__/lib/constants-paths.test.ts` — erwartete Query inkl. `scanId`.
