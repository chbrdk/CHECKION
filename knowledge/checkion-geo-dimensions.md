# GEO dimensions: Auffindbarkeit & Wiederverwertbarkeit

- **Scoring:** `lib/geo-dimensions-score.ts` — `computeGeoDimensionsScore()` blends two 0–100 axes (discoverability vs. repurposing) into the headline `generative.score` (weights ~52% / 48%).
- **Scanner:** `lib/scanner.ts` — `page.evaluate` adds JSON-LD flags (FAQPage, HowTo, BreadcrumbList, Organization/WebSite + sameAs/logo), heading counts, `<main>` word ratio, `dl dt` pairs; merged into `GenerativeEngineAudit` with `dimensions`, `discoverabilitySignals`, `repurposingSignals`, `dimensionBreakdown`.
- **Domain rollup:** `lib/domain-aggregation.ts` — `aggregateGenerative()` adds `avgDiscoverability`, `avgRepurposing`, `issuePatterns`, `weakestRepurposingPages`; capped in `lib/domain-summary.ts` alongside `generative.pages`.
- **Legacy:** `lib/geo-eeat-page-score.ts` (`computeGeoEeatPageScore`) kept for tests; single-scan headline GEO score uses dimensions only.
