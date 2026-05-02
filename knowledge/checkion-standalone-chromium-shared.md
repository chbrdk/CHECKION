# Standalone multi-device scan: ein Chromium

## Symptom

`POST /api/scan` mit Standard (Desktop + Tablet + Mobile) startete **drei** `puppeteer.launch()` parallel (`Promise.all` × `runScan`). Auf kleinen Containern (Coolify) kann das zu OOM / Chromium-Absturz führen → CDP bricht ab → Fehler wie **„The client is closed“** und HTTP **500** (Legacy-JSON-Pfad) bzw. NDJSON-Zeile `error`.

## Änderung

- Bei **mehr als einem Gerät**: ein Aufruf `launchStandaloneScanBrowser()` in `executeStandaloneScan`, dieselbe `Browser`-Instanz an jeden `runScan` als `sharedBrowser`. Geräte **nacheinander** (`for` + `await`), nicht drei Pages parallel — sonst weiterhin hoher RAM-Druck auf kleinen Hosts.
- `runScan` schließt nur die **Page** im `finally`; den **Browser** schließt nur der Aufrufer, wenn er ihn selbst gestartet hat (`ownBrowser`).
- Ein Gerät (`quickScan` oder nur `desktop`): unverändert ein Browser pro `runScan`.
- `app/api/scan/route.ts`: `export const runtime = 'nodejs'` (Puppeteer bricht auf Edge ab → oft **500**). Legacy-JSON (`x-checkion-scan-stream: 0`): Scan-Fehler → **422** + JSON, nicht 500.
- **Dynamischer Import** von `@/lib/scanner` erst in `executeStandaloneScan` — die Route lädt **kein** Puppeteer beim Modul-Start; fehlende Chromium-Deps würden sonst schon beim ersten Request einen **500** auslösen, bevor der NDJSON-Stream antwortet.
- **Immer noch 500 auf POST /api/scan:** Oft **nicht** die App, sondern **Proxy/Timeout** (langer Scan, Verbindung abgebrochen). In Coolify/Nginx `proxy_read_timeout` / ggf. `Body` der Antwort prüfen; Server-Logs nach `[CHECKION] POST /api/scan` durchsuchen.

## Relevante Dateien

- `lib/scanner.ts` — `launchStandaloneScanBrowser`, `sharedBrowser` / `ownBrowser`, `page.close()` + bedingtes `browser.close()`
- `app/api/scan/route.ts` — `executeStandaloneScan` verzweigt nach `devices.length`
- `lib/types.ts` — `ScanOptions.sharedBrowser`
