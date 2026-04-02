# Domain summary `?light=1` payload

- **Route:** `GET /api/scan/domain/[id]/summary?light=1` — built in `app/api/scan/domain/[id]/summary/route.ts`. Successful JSON responses include `Cache-Control: HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON` (see `lib/constants.ts`).
- **Purpose:** Initial load in `DomainScanProvider` avoids shipping huge JSON: no `SlimPage[]` (use `.../slim-pages`), no full `aggregated.seo.pages` (use `?seoFull=1` merge on Links & SEO tab).
- **Aggregation shrink:** `lib/domain-summary.ts` — `toLightAggregated()` caps URL-heavy arrays (UX per-page lists, broken links, SEO URL samples, `links.broken`, infra URL lists, generative `pages`, structure URL lists) using caps in `lib/constants.ts` (`DOMAIN_LIGHT_SUMMARY_*`).
- **Persisted payload (DB):** `toStoredAggregated()` uses the same capping logic with `DOMAIN_STORED_SUMMARY_*` (defaults align with light; change storage-only in `lib/constants.ts`). `buildStoredDomainPayload` applies this after each deep scan; optional `omitSlimPages` drops duplicate `SlimPage[]` when `domain_pages` exists — see `knowledge/checkion-domain-scan-storage.md`.
- **Issues:** Route already clears `aggregated.issues.issues`; light mode also clears `pagesByIssueCount` (issue drill-down uses paged domain APIs).
- **SEO counts:** UI must not rely on `missingMetaDescriptionUrls.length` for totals when URLs are sampled — use `totalPages - withMetaDescription` (see `DomainResultMain` Links & SEO section).
- **Tests:** `__tests__/api/domain-summary-light-route.test.ts` — mocks `buildDomainSummary` only; asserts real `toLightDomainSummaryApiPayload` caps via `GET ...?light=1`.
