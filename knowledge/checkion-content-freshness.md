# Content freshness (CHECKION)

- **Logic:** `lib/content-freshness.ts` — `computeContentFreshness()` merges HTTP `Last-Modified`, JSON-LD `datePublished` / `dateModified` (max over all nodes), and Open Graph `article:published_time`, `article:modified_time`, `og:updated_time`.
- **Collection:** `lib/scanner.ts` `page.evaluate` adds `contentFreshnessHints`; result field `contentFreshness` is set after `documentCacheHints` using `technicalInsights.mainDocumentCache` (e.g. `htmlLongCache` note).
- **UI:** `components/ContentFreshnessCard.tsx` on Infra tab (`app/results/[id]/page.tsx`); i18n keys under `results.contentFreshness*` in `locales/en.json` and `locales/de.json`.
- **Tests:** `__tests__/lib/content-freshness.test.ts`.
