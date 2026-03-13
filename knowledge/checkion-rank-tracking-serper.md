# Rank Tracking (Serper) – Checkion

## Overview

Rank tracking uses the Serper API (google.serper.dev) to determine at which **position** (1–100) a project domain appears in Google organic results for a given keyword. Country (`gl`) and language (`hl`) are always set (main markets). **Project competitors** (single source of truth on the project) are optionally tracked in the same SERP so each snapshot can include "us" and competitor positions for direct comparison.

## Behaviour

- **10 pages**: For each keyword we request up to 10 SERP pages (configurable via `SERP_NUM_PAGES` in `lib/serp-markets.ts`). Each Serper request uses `page: 1`, `page: 2`, … and we concatenate organic results in order.
- **Position**: We still check at which **position** the domain appears in this combined list (1-based). If not in top ~100, position is stored as `null`.
- **Competitor positions**: If the project has competitors (see project page), `fetchSerpPosition` is called with `competitorDomains`. The same SERP response is used to compute the first position of each competitor domain. Results are stored in `rank_tracking_positions.competitor_positions` (jsonb: domain → position). No extra API calls.
- **gl / hl**: Every Serper request sends `gl` (country) and `hl` (language). Defaults: `de`/`de`; main markets are defined in `lib/serp-markets.ts` (`SERP_MAIN_MARKETS`).

## Key files

- `lib/serp-markets.ts` – Main markets (country/language), defaults, `SERP_NUM_PAGES`.
- `lib/serp-api.ts` – `fetchSerpPosition(keyword, domain, { country, language, numPages, competitorDomains })`; returns `position` and `competitorPositions` (same SERP).
- `lib/db/schema.ts` – `rank_tracking_keywords`, `rank_tracking_positions` (includes `competitor_positions` jsonb). `projects.competitors` (jsonb string[]).
- `app/api/rank-tracking/refresh/route.ts` – Loads project competitors, calls `fetchSerpPosition` with `competitorDomains`, stores `competitorPositions` per snapshot.

## API (Serper)

POST to `https://google.serper.dev/search` with body e.g.:

```json
{ "q": "pumpen", "gl": "de", "hl": "de", "page": 10 }
```

One request per page; we collect `organic[].link` and find the index of the first URL whose host matches the tracked domain.
