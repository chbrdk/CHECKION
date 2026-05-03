# Zentrale Status-UI (CHECKION)

## Ziel

**Eine Anlaufstelle** für alle länger laufenden Jobs und ihre **Anzeige** (Snackbar, später optional Banner / Badge): keine verteilten Snackbars pro Seite ohne Kontext.

## Ist-Zustand (nach Umstellung Single-Scan)

| Bereich | Implementierung |
|--------|------------------|
| Single-Page-WCAG | `StatusUiProvider` + `useStatusUi().singlePageScan` → globales `ScanProgressSnackbar` in `StatusUiChrome` |
| Deep Domain | `StatusUiProvider.domainScan` + globale **`DomainScanProgressSnackbar`** (Polling + `sessionStorage`); Fortschrittskarte bleibt auf `/scan/domain` |
| Projekt-Starts | Nach erfolgreichem **`POST /api/scan/domain`** bzw. Competitor-/„Alle scannen“ ruft die Projektdetailseite `domainScan.attach({ scanId, startUrl, … })` auf (`app/projects/[id]/page.tsx`). „Alle scannen“: Snackbar folgt primär dem **eigenen** Domain-Scan; sonst dem ersten neu gestarteten Konkurrenten. |
| Journey Agent | Polling auf `/journey-agent/[jobId]` |
| GEO/E-E-A-T | Polling auf `/geo-eeat/[jobId]` |

## Architektur

1. **`StatusUiProvider`** (`components/status/StatusUiContext.tsx`): Direkt unter **`I18nProvider`** im Root-Layout (`app/layout.tsx`), damit Texte aus `locales/*` verfügbar sind.
2. **`StatusUiChrome`**: Rendert **zentrale Flächen** — `DomainScanProgressSnackbar` (unten) und `ScanProgressSnackbar` (darüber, Multi-Device-Einzelscan), fixiert `bottom` / `right`, `flexDirection: column-reverse`. Deep-Scan: `domainScan.attach()` + Key `checkion_domain_scan_session_v1` in `sessionStorage` für Navigation/Reload.
3. **`lib/status-ui/types.ts`**: `StatusJobKind` und pro-Job-State-Typen — erweitern für `domain_crawl`, `journey`, `geo_eeat`, …
4. **APIs / Streams**: `POST /api/scan` liefert **standardmäßig NDJSON-Stream** (Fehler als Zeile, HTTP 200); Legacy-JSON nur mit `x-checkion-scan-stream: 0` (`HEADER_CHECKION_SCAN_STREAM_OFF`). UI-Header in `lib/constants.ts`; Seiten mappen Server-Events → `applyProgressLine`. **Erster Request 500 (Legacy-Pfad):** Ohne Stream-Header landete der erste Aufruf auf dem JSON-Pfad; Exceptions vor Response → HTTP 500. Standard-Stream vermeidet das; zusätzlich **Puppeteer-Launch mit Retry** in `lib/scanner.ts` gegen flaky ersten Start. **Ganzes POST in try/catch:** Auth/Rate-Limit/Body-Parsing-Throws landen in `handleApiError`, nicht als unhandled 500. **`/scan` Projektliste:** `GET /api/projects` erst nach `sessionStatus !== 'loading'`, mit `fetchWithSessionCookies` + **`fetchOnceMoreOn5xx`** (`lib/fetch-retry-5xx.ts`) gegen einmaligen 5xx beim Mount (oft nicht `/api/scan`, sondern diese parallele Anfrage).

## Migrations-Reihenfolge (Vorschlag)

1. ~~Single-Page-Scan~~ (erledigt: Context + NDJSON)
2. **Deep-Scan-Start** von `/scan` oder Projekt: Fortschritt/Queue in `StatusUi` spiegeln, wenn sinnvoll (oder nur „Job gestartet“ + Link)
3. **Journey / GEO**: Option A — Ministatus in `StatusUiChrome` während Poll; Option B — nur globale „Aktivität“-Indikation
4. Optional: **einheitliche Toasts** für kurze Erfolgs-/Fehlermeldungen (nicht mit Langläufern vermischen)

## Konventionen

- **`useStatusUi()`** nur in Client-Komponenten; außerhalb Provider → Fehler (bewusst).
- **Navigation nach Erfolg** bleibt in der **auslösenden Seite** (`router.push`); der Provider schließt nur die Session (`close()`).
- Neue Job-Typen: Typ in `lib/status-ui/types.ts`, State im Provider, Snackbar/Render in `StatusUiChrome` oder kleinem Sub-Component.

## Verwandte Dateien

- `components/ScanProgressSnackbar.tsx` — Darstellung (kein Business-State)
- `lib/scan-stream-parse.ts` — NDJSON-Reader für `/api/scan`
- `lib/scan-progress.ts` — NDJSON-Typen
- `knowledge/checkion-single-scan-structure.md` — Backend-Session-Modell
