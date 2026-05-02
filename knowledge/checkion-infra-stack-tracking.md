# Infrastruktur: System / Stack & Tracking

## CMS / Plattformen

- Zentrale Regelliste: `lib/infra-platform-detect.ts` → `collectDetectedPlatforms` (Frameworks, Shops, klassische CMS, **Enterprise/DXP**, **Headless/API-CMS**, Commerce-APIs, Foren, …).
- **DXP / Enterprise (Auszug):** AEM (+ erweiterte Pfade), Adobe Target, Sitecore, Launch, Bloomreach, Optimizely/Episerver, Liferay, Tridion/RWS, CoreMedia, FirstSpirit, Magnolia, dotCMS, Jahia, Squiz, Crownpeak, Kentico Xperience (ohne Kontent.ai), Acquia, Enonic, Crafter, Oracle OCE, Salesforce Experience, OpenText, IBM WCM, HCL DX, Censhare, Scrivito.
- **Headless / API (Auszug):** Contentful, Sanity, Storyblok, Prismic, Strapi, Hygraph, Kontent.ai, Butter, Cosmic, Builder, Payload, Tina, Directus, Dato, Amplience, Contentstack, Makeswift, Caisy, microCMS, Flotiq, Prepr, TakeShape, Lexascms, Crystallize, Webiny, Squidex, Cockpit, Keystone, Apostrophe, Decap, Hashnode, WPGraphQL/Faust, Saleor, Medusa, Commerce Layer, Shopify Hydrogen, …
- Eingaben: `meta[name=generator]`, `script[src]`, `link[href]`, **`img[src]`**, Inline-Skript-Schnipsel, WP-/Next-Signale aus `lib/scanner.ts` (`domInfraHints`).
- Kein Anspruch auf Vollständigkeit: Self-Hosting ohne bekannte Hosts, reines API-Backend, oder starkes CSP können Erkennung ausbleiben.

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
