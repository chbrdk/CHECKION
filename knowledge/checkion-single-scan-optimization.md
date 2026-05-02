# Single-Scan Optimierung (Implementierung)

## Geräte / Kosten

- **`resolveStandaloneScanDevices`** — [`lib/standalone-scan-devices.ts`](lib/standalone-scan-devices.ts): Body `devices[]`, `quickScan` (nur Desktop), oder Env **`SCAN_STANDALONE_DEVICES`** (kommasepariert). Default: alle drei Geräte.
- **POST /api/scan** — [`app/api/scan/route.ts`](app/api/scan/route.ts) nutzt die aufgelöste Liste für `Promise.all(runScan)`.

## Telemetrie / Budgets

- **Phasen-Timing** — [`lib/scan-phase-timing.ts`](lib/scan-phase-timing.ts); Logs wenn **`CHECKION_SCAN_DEBUG`** oder **`CHECKION_SCAN_TIMING_LOG=1`**.
- **Konstanten** — [`lib/constants.ts`](lib/constants.ts): `SCAN_NAVIGATION_TIMEOUT_MS`, `SCAN_EARLY_THIRD_PARTY_SCRIPT_HOST_CAP`, `SCAN_SCRIPT_RESOURCE_COUNT_CAP`, `SCAN_GREEN_WEB_FETCH_TIMEOUT_MS`.

## UI / PDF / i18n

- Schnellscan: [`app/scan/page.tsx`](app/scan/page.tsx) + `scan.quickScan*` in Locales.
- Hinweis bei &lt;3 Geräte: [`app/results/[id]/page.tsx`](app/results/[id]/page.tsx) + `results.sessionPartialDevicesHint`.
- Karten: `PerformanceCard`, `SecurityCard`, `PrivacyCard` — Untertitel/Consent-Titel über i18n, `info.heuristicSignalsBrief`.
- PDF: [`components/pdf/ScanReportDocument.tsx`](components/pdf/ScanReportDocument.tsx) — Performance (Protocol, Script-KB), Green Web, JSON-LD-Gaps, Consent/Security/Cache.

## Tests

- `__tests__/lib/standalone-scan-devices.test.ts`
- `__tests__/lib/scan-phase-timing.test.ts`
