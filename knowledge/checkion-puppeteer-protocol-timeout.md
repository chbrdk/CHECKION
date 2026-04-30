# Puppeteer: `Page.captureScreenshot timed out`

Single-page scans (`lib/scanner.ts`) set **`protocolTimeout`** on `puppeteer.launch()` via **`PUPPETEER_PROTOCOL_TIMEOUT_MS`** in `lib/constants.ts` (default **600_000** ms). CDP full-page screenshots can exceed Puppeteer’s previous default (~180s) on large sites.

Optional env: **`PUPPETEER_PROTOCOL_TIMEOUT_MS`** (number, minimum `60000`).
