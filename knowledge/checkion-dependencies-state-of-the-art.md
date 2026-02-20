# CHECKION – Dependencies Abgleich (State of the Art)

Stand: Abgleich mit Websuche (2026).

## Kern-Stack ✅

| Paket | Projekt | Aktuell / Empfehlung |
|-------|---------|----------------------|
| **next** | 16.1.6 | ✅ Aktuelle stabile Version; 16.2.0 in Canary (Stand 2026). |
| **react** / **react-dom** | 19.2.3 | 🔄 **19.2.4** verfügbar (Jan 2026, u. a. DoS-Mitigations für Server Actions / Server Components). Empfohlen: Update auf 19.2.4. |
| **typescript** | ^5 | ✅ TypeScript 5.x aktuell. |
| **drizzle-orm** | ^0.45.1 | ✅ 0.45.1 letzte stabile 0.x; **1.0** weiterhin Beta (v1.0.0-beta.15, Roadmap ~94 %). |
| **drizzle-kit** | ^0.31.9 | ✅ Passt zu Drizzle 0.x. |
| **zod** | ^4.3.6 | ✅ Zod 4.3.6 aktuelle stabile v4. |
| **openai** | ^6.22.0 | ✅ Aktuelles offizielles Node-SDK. |
| **sharp** | ^0.34.5 | ✅ Aktuelle stabile Version. |
| **axe-core** | ^4.11.1 | ✅ Aktuell für Accessibility-Tests. |
| **lucide-react** | ^0.563.0 | ✅ Regelmäßige Updates. |

## UI & Auth

| Paket | Projekt | Aktuell / Empfehlung |
|-------|---------|----------------------|
| **@mui/material** | ^7.3.5 | 🔄 Neuere Patches (z. B. 7.3.8) verfügbar; optional `npm update @mui/material`. |
| **@emotion/react** / **styled** | ^11.14.x | ✅ Mit MUI 7 kompatibel. |
| **next-auth** | ^5.0.0-beta.30 | ⚠️ v5 offiziell weiterhin Beta (Stand 2026). Kein stabiles 5.x-Release angekündigt; wird oft produktiv genutzt. |

## Browser & Testing

| Paket | Projekt | Aktuell / Empfehlung |
|-------|---------|----------------------|
| **puppeteer** | ^24.37.2 | 🔄 Neuere Patches verfügbar; optional `npm update puppeteer`. |
| **pa11y** | ^8.0.0 | ✅ Aktuelle Major-Version. |

## Dev & Tooling

| Paket | Projekt | Aktuell / Empfehlung |
|-------|---------|----------------------|
| **@next/bundle-analyzer** | 16.1.6 | ✅ An Next.js 16.1.6 angepasst. |
| **eslint-config-next** | 16.1.6 | ✅ Entspricht Next-Version. |
| **eslint** | ^9 | ✅ ESLint 9 aktuell. |
| **@types/react** / **react-dom** | ^19 | ✅ Entspricht React 19. |

## Lokale / spezielle Pakete

- **@msqdx/react**, **@msqdx/tokens**: `file:../msqdx-design-system/...` – versionsunabhängig vom öffentlichen npm-Stand.

## Empfohlene Anpassungen (2026)

1. **React / React-DOM** auf **19.2.4** setzen (Security-Updates für Server Actions/Server Components):  
   `npm install react@19.2.4 react-dom@19.2.4`
2. Optional: Patch-Updates für **@mui/material**, **puppeteer** per `npm update`.

## Quellen (Webrecherche 2026)

- Next.js: nextjs.org, GitHub Releases (16.1.6 stable, 16.2.0-canary)
- React: react.dev/versions (19.2.4 Jan 2026)
- Drizzle: orm.drizzle.team, v1.0 Beta
- Auth.js v5: authjs.dev, next-auth@beta
- MUI v7, Puppeteer, axe-core, Zod, OpenAI, sharp: jeweilige npm-Paketseiten und Releases
