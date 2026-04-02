## 0) Meta
- **Feature-ID**: p1-project-summaries
- **Scope**:
  - `app/api/projects/[id]/ranking-summary/route.ts`
  - `app/api/projects/[id]/geo-summary/route.ts`
  - `app/api/projects/[id]/domain-summary*/route.ts`
  - `lib/db/*` (projects, scans, rank-tracking)
- **Risk**: P1
- **Status**: in_review

## 1) Performance notes (current)
- Summaries aggregieren über Keywords/Positions; `getLastPositionsByKeywordIds` lädt Positionen und baut Map (O(n)).
- Open topic: caching/invalidations für Summaries (Dashboard reloads) + pagination im UI.

## 2) Evidence
- Existing tests: `__tests__/api/project-ranking-summary.test.ts`, `__tests__/api/project-geo-summary.test.ts`

## 3) Open checks / actions
- [ ] Confirm summary endpoints are rate-limited (or safe without) and do not over-fetch
- [ ] Add caching strategy (etag/tag cache) with explicit invalidation on writes

