# CHECKION – Accessibility engine versions

Updated: 2026-06-18

## Direct dependencies (`package.json`)

| Package | Version | Role |
|---------|---------|------|
| `axe-core` | ^4.12.1 (resolved 4.12.1) | Direct injection in `lib/scanner.ts` for passed-audit capture + APCA |
| `pa11y` | ^9.1.1 | WCAG issue runners `axe` + `htmlcs` |
| `puppeteer` | ^24.37.2 | Browser for scans (CHECKION-owned; pa11y 9 also expects Puppeteer 24) |

## Transitive (via pa11y 9.1.1)

| Package | Resolved | Role |
|---------|----------|------|
| `axe-core` | 4.11.4 | pa11y `axe` runner (issue detection) |
| `@pa11y/html_codesniffer` | 2.6.0 | pa11y `htmlcs` runner |

Previously (pa11y 8): `axe-core` 4.8.4, `html_codesniffer` 2.5.1.

## Node.js

- pa11y 9 requires **Node ≥ 20** (CHECKION Docker: `node:22-bookworm-slim`).

## Upgrade notes

- Scan results may differ vs. older engine versions (new/fixed rules).
- Re-run a known reference URL after upgrades to baseline issue counts.
