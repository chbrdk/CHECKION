# CHECKION – Multi-market SEO (Intent + Compare)

## Concept

- **Search intent** (`intent_key`, `intent_label`): groups localized keyword rows across markets.
- **Market variant**: one `rank_tracking_keywords` row = `keyword` text + `country`/`language` (Serper `gl`/`hl`).
- **Compare view**: Rankings page → „Nach Intention“ → multi-line chart per intent (`RankIntentCompareChart`).

## Key paths

| Path | Role |
|------|------|
| `lib/serp-markets.ts` | `SERP_MAIN_MARKETS`, `marketKey`, `parseMarketKey` |
| `lib/serp-intent.ts` | `groupKeywordsByIntent`, `resolveIntentFields` |
| `lib/geo-queries-by-market.ts` | `geo_queries` as `string[]` or `Record<marketKey, string[]>` |
| `lib/llm/localize-keywords.ts` | OpenAI localization for multi-market keywords |
| `POST /api/rank-tracking/keywords/localize` | Localize + optional `persist: true` |
| `POST /api/rank-tracking/keywords/bulk` | Create many variants with shared intent |
| `POST /api/projects/[id]/research` | Body `{ marketKeys?: string[] }` → per-market SEO/GEO |

## DB

- Migration `lib/db/migrations/0025_rank_tracking_intent.sql` — applied via `drizzle-kit push` on deploy.
- Columns: `rank_tracking_keywords.intent_key`, `intent_label`.

## UI

- **Rankings** (`app/projects/[id]/rankings/page.tsx`): intent vs flat view; multi-market add via localize.
- **Research** (`app/projects/[id]/research/page.tsx`): select markets before research; apply keywords/GEO per market.

## GEO queries

Legacy projects keep flat `string[]` (treated as `de-de`). New research can store `geoQueriesByMarket` on PATCH project.
