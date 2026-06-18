# CHECKION – Scan-Overlay-Dismiss (Modals, Chat, Newsletter)

Ergänzt `knowledge/cookie-banner-dismiss.md` für **nicht-Cookie**-Störungen bei Screenshots und visueller Analyse.

**Immer aktiv** — kein Opt-out pro Scan. Jeder Puppeteer-Pfad nutzt `createScanPage` bzw. `wireVisualDismissForBrowser`.

## Module

| Datei | Rolle |
|-------|--------|
| `lib/cookie-banner-dismiss.ts` | CMP / Cookie / Consent |
| `lib/scan-overlay-dismiss.ts` | Chat-Widgets, Newsletter, Promo-Modals |
| `lib/scan-visual-dismiss.ts` | Orchestrator: `createScanPage`, `wireVisualDismissForBrowser`, `registerVisualDismissOnNewDocument`, `dismissVisualInterruptions` |

## Scanner-Integration (`lib/scanner.ts`)

1. Beim Browser-Start: `wireVisualDismissForBrowser(browser)` (jedes neue Tab)
2. Pro Scan: `createScanPage(browser)` — einheitliches Early-CSS + MutationObserver **vor** Navigation
3. Nach `page.goto`: `dismissVisualInterruptions(page)`
4. Vor Screenshot: erneut `dismissVisualInterruptions(page)`

Weitere Pfade: `app/api/tools/extract/route.ts` (Extract-Tool).

## Overlay-Ablauf

1. **Früh-CSS** (kombiniert Cookie + Overlay) per `evaluateOnNewDocument`
2. **MutationObserver** für spät injizierte Hosts (Usercentrics, Intercom, …)
3. **CSS** für Newsletter/Promo-Dialoge (`[role="dialog"][aria-label*="newsletter"]`, …)
4. **Close-Klicks** per Selektor + mehrsprachige Texte („Schließen“, „Not now“, …)
5. **Escape-Taste** (Puppeteer) für native `<dialog>` / ESC-fähige Modals
6. **Retries**: Standard **3×**, **800 ms** Abstand (`VISUAL_DISMISS_DEFAULT_OPTIONS`)
7. **Cookie-Schutz**: Elemente mit `cookie|consent|usercentrics|…` im Label werden nicht geschlossen (Cookie-Dismiss bleibt zuständig)

## Smoke-Test

```bash
npx tsx scripts/smoke-visual-dismiss.ts https://www.pronovabkk.de/
```

Ausgabe unter `tmp/visual-dismiss-smoke/`.

## Grenzen

- Geschlossene Shadow DOMs (selten bei Chat-Widgets)
- Vollwertige App-Shells (`role="dialog"` als Haupt-UI) — nur keyword-basiert ausgeblendet
- iFrame-only Widgets ohne bekannten Container-Selektor
