# Standalone multi-device scan: ein Chromium

## Symptom

`POST /api/scan` mit Standard (Desktop + Tablet + Mobile) startete **drei** `puppeteer.launch()` parallel (`Promise.all` × `runScan`). Auf kleinen Containern (Coolify) kann das zu OOM / Chromium-Absturz führen → CDP bricht ab → Fehler wie **„The client is closed“** und HTTP **500** (Legacy-JSON-Pfad) bzw. NDJSON-Zeile `error`.

## Änderung

- Bei **mehr als einem Gerät**: ein Aufruf `launchStandaloneScanBrowser()` in `executeStandaloneScan`, dieselbe `Browser`-Instanz an jeden `runScan` als `sharedBrowser`.
- `runScan` schließt nur die **Page** im `finally`; den **Browser** schließt nur der Aufrufer, wenn er ihn selbst gestartet hat (`ownBrowser`).
- Ein Gerät (`quickScan` oder nur `desktop`): unverändert ein Browser pro `runScan`.

## Relevante Dateien

- `lib/scanner.ts` — `launchStandaloneScanBrowser`, `sharedBrowser` / `ownBrowser`, `page.close()` + bedingtes `browser.close()`
- `app/api/scan/route.ts` — `executeStandaloneScan` verzweigt nach `devices.length`
- `lib/types.ts` — `ScanOptions.sharedBrowser`
