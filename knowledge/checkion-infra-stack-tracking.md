# Infrastruktur: System / Stack & Tracking

## Datenmodell (`GeoAudit` in `lib/types.ts`)

- `detectedPlatforms` — Heuristik (z. B. Next.js, WordPress, Shopify).
- `detectedTracking` — `{ id, name }` (z. B. GTM, Meta Pixel, Matomo).
- `hostingHints` — optional `server` und `poweredBy` aus HTTP-Headern (`Server`, `X-Powered-By`), gekürzt.

## Erfassung

- Browser: `page.evaluate` in `lib/scanner.ts` liefert `domInfraHints` (Generator-Meta, `script[src]`, `link[href]`, Inline-Skript-Auszug, Next/WP-Signale).
- Node: `inferInfraStackAndTracking` in `lib/infra-detect.ts` verarbeitet DOM-Hints + Header.
- Nach dem Scan: `mergeTrackingFromThirdPartyHosts` ergänzt Tools anhand der gesammelten Third-Party-Hosts (`technicalInsights.thirdPartyDomains` / Netzwerk-Trace). Einträge nur aus dem Netzwerk tragen den Namenszusatz ` (Netzwerk)`.

## UI

- `components/InfraCard.tsx` — Abschnitte „System & Hosting“ und „Tracking & Tags“.

## Tests

- `__tests__/lib/infra-detect.test.ts`
