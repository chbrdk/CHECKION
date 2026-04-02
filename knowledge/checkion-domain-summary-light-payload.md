# Domain summary `?light=1` payload

- **Route:** `GET /api/scan/domain/[id]/summary?light=1` — built in `app/api/scan/domain/[id]/summary/route.ts`.
- **Purpose:** Initial load in `DomainScanProvider` avoids shipping huge JSON: no `SlimPage[]` (use `.../slim-pages`), no full `aggregated.seo.pages` (use `?seoFull=1` merge on Links & SEO tab).
- **Aggregation shrink:** `lib/domain-summary.ts` — `toLightAggregated()` caps URL-heavy arrays (UX per-page lists, broken links, SEO URL samples, `links.broken`, infra URL lists, generative `pages`, structure URL lists) using caps in `lib/constants.ts` (`DOMAIN_LIGHT_SUMMARY_*`).
- **Issues:** Route already clears `aggregated.issues.issues`; light mode also clears `pagesByIssueCount` (issue drill-down uses paged domain APIs).
- **SEO counts:** UI must not rely on `missingMetaDescriptionUrls.length` for totals when URLs are sampled — use `totalPages - withMetaDescription` (see `DomainResultMain` Links & SEO section).
