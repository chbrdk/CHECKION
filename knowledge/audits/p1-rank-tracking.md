## 0) Meta
- **Feature-ID**: p1-rank-tracking
- **Scope**:
  - `app/api/rank-tracking/refresh/route.ts`
  - `app/api/rank-tracking/keywords/**`
  - `lib/serp-api.ts`, `lib/serp-markets.ts`, `lib/external-apis.ts`
  - `lib/db/rank-tracking-keywords.ts`, `lib/db/rank-tracking-positions.ts`
- **Risk**: P1 (perf + cost + external dependency)
- **Status**: in_review

## 1) Performance notes (current)
- Refresh läuft aktuell **sequenziell** über Keyword-IDs (for-loop). Das ist stabil, aber kann bei vielen Keywords langsam werden.
- Guardrail: wenn `SERP_API_KEY` fehlt → 502 (Test vorhanden: `__tests__/api/rank-tracking-refresh.test.ts`).

## 2) Open checks / actions
- [ ] Add rate limit on refresh endpoint (cost control)\n+- [ ] Add per-project batching/concurrency limit (e.g. max N keywords per refresh)\n+- [ ] Add timeout + retry policy in `fetchSerpPosition`\n+
