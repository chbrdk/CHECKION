# Zentrale Status-UI (CHECKION)

## Ziel

**Eine Anlaufstelle** für alle länger laufenden Jobs und ihre **Anzeige** (Snackbar, später optional Banner / Badge): keine verteilten Snackbars pro Seite ohne Kontext.

## Ist-Zustand (nach Umstellung Single-Scan)

| Bereich | Implementierung |
|--------|------------------|
| Single-Page-WCAG | `StatusUiProvider` + `useStatusUi().singlePageScan` → globales `ScanProgressSnackbar` in `StatusUiChrome` |
| Deep Domain | Eigene Progress-UI auf `/scan/domain` (schrittweise hier einbinden) |
| Journey Agent | Polling auf `/journey-agent/[jobId]` |
| GEO/E-E-A-T | Polling auf `/geo-eeat/[jobId]` |

## Architektur

1. **`StatusUiProvider`** (`components/status/StatusUiContext.tsx`): Direkt unter **`I18nProvider`** im Root-Layout (`app/layout.tsx`), damit Texte aus `locales/*` verfügbar sind.
2. **`StatusUiChrome`**: Rendert **zentrale Flächen** (aktuell nur Single-Scan-Snackbar). Weitere Surfaces ( zweite Snackbar-Spur, kompakte Bottom-Bar, Header-Badge) werden **hier** ergänzt, nicht auf Einzelseiten.
3. **`lib/status-ui/types.ts`**: `StatusJobKind` und pro-Job-State-Typen — erweitern für `domain_crawl`, `journey`, `geo_eeat`, …
4. **APIs / Streams**: Weiter zentral in `lib/constants.ts` (Header `HEADER_CHECKION_SCAN_STREAM` usw.); Seiten rufen `useStatusUi()` auf und mappen Server-Events → `applyProgressLine` o. ä.

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
