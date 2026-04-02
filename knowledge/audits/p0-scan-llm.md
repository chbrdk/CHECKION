## 0) Meta
- **Feature-ID**: p0-scan-llm
- **Scope**:
  - Scan entrypoints: `app/api/scan/**`, `app/api/scan/domain/**`
  - Scanner: `lib/scanner.ts`
  - URL validation: `lib/api-schemas.ts`, `lib/url-safety.ts`
  - LLM: `lib/llm/*`, `app/api/scan/*/classify|summarize|ux-check`
- **Risk**: P0
- **Status**: in_review

## 1) Threat model (light)
- **Assets**: network access from server, stored scan artifacts (excerpt/screenshot), LLM spend
- **Attackers**: authenticated user (can submit URLs), cost-exhaustion actor
- **Primary abuse paths**:
  - SSRF via scan URL (localhost/private IP)
  - LLM abuse (high tokens / repeated calls)
  - long-running puppeteer scans causing resource exhaustion

## 2) Current state (evidence)
- URL guardrail added at API validation layer:
  - `lib/url-safety.ts` + tests `__tests__/lib/url-safety.test.ts`
  - `urlSchema` now rejects localhost/private IPs (see `lib/api-schemas.ts`)
- Scan endpoint is rate limited:
  - `POST /api/scan` uses `checkRateLimit('scan:<userId>')`
- LLM page classification uses bounded tokens:
  - `PAGE_CLASSIFY_MAX_TOKENS` in `lib/llm/config.ts`

## 3) Open checks / actions
- [ ] Verify domain scan endpoint has equivalent URL safety validation + rate limits
- [ ] Ensure puppeteer navigation has strict timeouts and max response sizes (scanner)
- [ ] Add explicit rate limits for LLM endpoints (classify/summarize/ux-check)

