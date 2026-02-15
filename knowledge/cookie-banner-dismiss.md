# Cookie-Banner-Unterdrückung im Scan

Damit Scans (Screenshot, axe/htmlcs) nicht durch Cookie-/Consent-Banner verfälscht werden, blendet CHECKION Banner vor dem Lauf aus und versucht, „Akzeptieren“-Buttons zu klicken.

## Wo es wirkt

- **`lib/cookie-banner-dismiss.ts`**: CSS-Selektoren, Button-Texte (mehrsprachig), Skript für Browser-Kontext, Puppeteer-Helfer `dismissCookieBanner(page)`.
- **`lib/scanner.ts`**:
  1. Nach eigener Navigation (`page.goto`) wird `dismissCookieBanner(page)` aufgerufen, **bevor** pa11y (axe/htmlcs) läuft.
  2. Vor dem Screenshot wird es erneut aufgerufen (für verzögert geladene Banner).

## Ablauf

1. **CSS ausblenden**: Ein `<style>` mit vielen Selektoren wird injiziert (`display: none !important` etc.) für bekannte Container (OneTrust, Cookiebot, CookieYes, …) und generische Muster (`[id*="cookie"]`, `[aria-label*="consent"]` usw.).
2. **Klick per Selektor**: Feste Selektoren für typische „Akzeptieren“-Buttons (z. B. `#onetrust-accept-btn-handler`, `.cky-btn-accept`, …) werden nacheinander geprüft; der erste sichtbare wird geklickt.
3. **Klick per Text**: Alle `button`, `a`, `[role="button"]`, `input[type="submit"]` werden gesammelt; deren Text (inkl. `aria-label`) wird normalisiert und mit einer mehrsprachigen Liste von Akzeptieren-Texten abgeglichen; der erste Treffer wird geklickt.

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
- Generische Muster (cookie, consent, gdpr, cc-window, …)

## Sprachen für Button-Erkennung

DE, EN, FR, ES, IT, NL, PL, PT, SV, DA, NO, FI, CS, SK, HU, RO, BG, EL, RU, TR, JA, ZH, AR, HE (u. a. „Akzeptieren“, „Accept“, „Accept all“, „accepter“, „aceptar“, „accetta“, „akzeptuj“, „同意“, „قبول“, „קבל“ usw.).

## Erweiterung

- **Neue Anbieter**: In `lib/cookie-banner-dismiss.ts` `COOKIE_BANNER_HIDE_CSS` um Container-Selektoren und ggf. `ACCEPT_BUTTON_SELECTORS` um den Akzept-Button erweitern.
- **Neue Sprachen/Texte**: In `ACCEPT_BUTTON_TEXTS` weitere Zeilen (klein geschrieben) ergänzen.

## Hinweis

Das Ausblenden/Klicken dient nur der technischen Scan-Qualität (weniger False Positives, sauberer Screenshot). Es wird kein echtes Consent gegeben; für manuelle oder rechtlich relevante Prüfungen die Seite ggf. ohne Dismiss laufen lassen (optionaler Schalter in Zukunft denkbar).
