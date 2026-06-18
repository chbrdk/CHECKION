# CHECKION – Skip-Link-Erkennung (UX-Scan)

## Modul

`lib/skip-link-detect.ts` — `detectSkipLinkOnPage(page)` für den UX-Block in `lib/scanner.ts`.

## Erkannte Muster

| Typ | Beispiel |
|-----|----------|
| Anker mit Fragment | `<a href="#main-content" class="skip-link">` |
| Button mit Skip-Text | Pronova BKK: `<button class="visually-hidden-focusable" title="Zum Hauptinhalt springen">` |
| `role="link"` + Skip-Label | gleiche Semantik wie Button-Skip |

## Signale

- **Text / aria-label / title**: u. a. `springen`, `hauptinhalt`, `zum inhalt`, `skip to content`
- **Klassen**: `skip-link`, `visually-hidden-focusable` (nur mit passendem Label)
- **href-Fragmente**: `#main-content`, `#content`, `#inhalt`, …
- **Main-Landmark**: bei Button-Skip wird `#id` des `<main>`-Elements als `skipLinkHref` zurückgegeben

## Debug

```bash
npx tsx scripts/debug-skip-link.ts https://www.pronovabkk.de/
```

## Tests

`__tests__/lib/skip-link-detect.test.ts`
