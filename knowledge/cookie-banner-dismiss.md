# Cookie-Banner-Unterdrückung im Scan

Damit Scans (Screenshot, axe/htmlcs) nicht durch Cookie-/Consent-Banner verfälscht werden, blendet CHECKION Banner vor dem Lauf aus und versucht, „Akzeptieren“-Buttons zu klicken.

## Wo es wirkt

- **`lib/cookie-banner-dismiss.ts`**: CSS-Selektoren, Button-Texte (mehrsprachig), Skript für Browser-Kontext, Puppeteer-Helfer `dismissCookieBanner(page)`.
- **`lib/scan-visual-dismiss.ts`**: Kombinierter Orchestrator — **immer aktiv**, kein Opt-out.
- **`lib/scanner.ts`** (alle Single-/Domain-/Deep-Scans über `runScan`):
  1. `wireVisualDismissForBrowser` beim Browser-Start
  2. `createScanPage` vor Navigation (Early-CSS + MutationObserver)
  3. Nach `page.goto`: `dismissVisualInterruptions`
  4. Vor Screenshot: erneut `dismissVisualInterruptions`
- **`app/api/tools/extract/route.ts`**: gleicher Dismiss-Pfad nach `goto`.

Siehe auch: `knowledge/scan-overlay-dismiss.md` (Chat, Newsletter, Promo-Modals).

## Ablauf

1. **Früh ausblenden (`registerVisualDismissOnNewDocument`)**: Kombiniertes Hide-CSS per `evaluateOnNewDocument`, **bevor** die Seite lädt — wichtig für asynchrone CMPs wie Usercentrics. **MutationObserver** blendet spät injizierte Hosts sofort aus.
2. **CSS ausblenden**: Ein `<style>` mit vielen Selektoren wird injiziert (`display: none !important` etc.) für bekannte Container (OneTrust, Cookiebot, **Usercentrics**, Funding Choices, …) und generische Muster.
3. **Shadow-DOM-Klick**: Für offene Shadow Roots (Usercentrics `#usercentrics-root`, Google `.fc-consent-root`) wird `shadowRoot.querySelector(...)` genutzt — normales CSS/Klicken reicht dort nicht.
4. **Klick per Selektor**: Feste Selektoren für typische „Akzeptieren“-Buttons.
5. **Klick per Text**: Mehrsprachige Button-Texte.
6. **Retries**: `dismissVisualInterruptions` wiederholt Ausblenden/Klick (Standard **3×**, **800 ms** Abstand) für verzögert geladene Banner; vor Screenshot erneut.

## Abgedeckte Anbieter / Integrationen (CSS + ggf. Klick)

- OneTrust  
- Cookiebot  
- CookieYes  
- Quantcast Choice  
- Termly  
- TrustArc  
- Cookie Law Info / CLI  
- GDPR Cookie Consent (Moove)  
- Complianz  
- Didomi  
- Axeptio  
- Tarteaucitron  
- **Usercentrics** (CSS auf Host + Shadow-DOM `uc-accept-all-button`) — z. B. [pronovabkk.de](https://www.pronovabkk.de/)  
- **Google Funding Choices** (`.fc-consent-root`)  
- Borlabs Cookie  
- Generische Muster (cookie, consent, gdpr, cc-window, …)

## Sprachen für Button-Erkennung

DE, EN, FR, ES, IT, NL, PL, PT, SV, DA, NO, FI, CS, SK, HU, RO, BG, EL, RU, TR, JA, ZH, AR, HE (u. a. „Akzeptieren“, „Accept“, „Accept all“, „accepter“, „aceptar“, „accetta“, „akzeptuj“, „同意“, „قبول“, „קבל“ usw.).

## Erweiterung

- **Neue Anbieter**: In `lib/cookie-banner-dismiss.ts` `COOKIE_BANNER_HIDE_CSS` um Container-Selektoren und ggf. `ACCEPT_BUTTON_SELECTORS` um den Akzept-Button erweitern.
- **Neue Sprachen/Texte**: In `ACCEPT_BUTTON_TEXTS` weitere Zeilen (klein geschrieben) ergänzen.

## Hinweis

Das Ausblenden/Klicken dient der technischen Scan-Qualität (weniger False Positives, sauberer Screenshot). Es wird kein echtes Consent gegeben; der Dismiss läuft bei **allen** Scans automatisch.
