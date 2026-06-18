# CHECKION – Deep-Scan Seitenlimit (maxPages)

## Konstanten

- `lib/spider.ts`: `DOMAIN_SCAN_DEFAULT_MAX_PAGES` (1000), `DOMAIN_SCAN_MAX_PAGES_CAP` (10000), `resolveDomainScanMaxPages()`
- `lib/domain-scan-max-pages.ts`: Presets für UI, `parseDomainScanMaxPagesParam()`, Select-Optionen
- `lib/constants.ts`: `DOMAIN_SCAN_MAX_PAGES_STORAGE_KEY` (`checkion_domain_scan_max_pages`)

## UI

- `components/DomainScanMaxPagesSelect.tsx` – gemeinsames Auswahlfeld (50 … 1000, „Alle (10000)“)
- `hooks/useDomainScanMaxPages.ts` – liest/schreibt Präferenz in `localStorage`, optional URL-Override

Eingebunden auf:

- `/scan/domain` (Deep-Scan-Start)
- `/scan` (Modus „Deep Scan“)
- `/projects/[id]` (Firmeninfo + Domain-Score-Karte)

## API

- `POST /api/scan/domain` – Body `{ maxPages?: number }`
- `POST /api/projects/[id]/domain-scan-all` – Query `?maxPages=…`
- `POST /api/projects/[id]/domain-scan-competitor` – Body oder Query `maxPages`

Werte werden serverseitig auf 1 … 10000 begrenzt.
