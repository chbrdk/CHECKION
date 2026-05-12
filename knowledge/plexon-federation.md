# CHECKION Federation with PLEXON

Stand: Mai 2026

## Rolle von CHECKION

`CHECKION` bleibt ein eigenstaendiges Produkt und wird foederiert an `PLEXON` angebunden. Die Produktdatenbank und die produktlokalen APIs bleiben in `CHECKION`.

## PLEXON-Vertrag

- Vertragsversion: `2026-05-plexon-federation-v2`
- Request-Header an PLEXON: `X-Plexon-Contract-Version`
- Service-Authentifizierung: `X-Service-Secret`

Die Header werden in `lib/plexon-contract.ts` gebuendelt und von `lib/plexon-auth.ts` sowie `lib/usage-report.ts` verwendet.

## Basisfaehigkeiten fuer foederierten Betrieb

- zentrales Credential-Checking ueber PLEXON
- Profil-Lesen/-Patch ueber PLEXON
- Usage-Reporting nach PLEXON
- Base-Path-Readiness fuer spaetere Host-Konvergenz

## Base-Path-Readiness

`CHECKION` unterstuetzt jetzt:

- `BASE_PATH` in `next.config.mjs`
- Asset-Prefix fuer statische Dateien
- zentrales `getAppBasePath()` / `getPublicAssetPath()` in `lib/constants.ts`
- normalisierte Redirect-Logik in `proxy.ts`

Das ist vor allem eine **Vorbereitung**. Das primaere Zielbild bleibt Subdomains-first.

## Relevante Dateien

- `next.config.mjs`
- `proxy.ts`
- `lib/constants.ts`
- `lib/plexon-contract.ts`
- `lib/plexon-auth.ts`
- `lib/usage-report.ts`
- `app/layout.tsx`
