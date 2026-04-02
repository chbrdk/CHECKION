## Audit Template (Security / Performance / Standards)

Dieses Template wird pro Feature/Integration ausgefüllt in `knowledge/audits/<feature-id>.md`.

---

## 0) Meta
- **Feature-ID**:
- **Scope** (API routes / pages / libs):
- **Owner**:
- **Risk**: P0 | P1 | P2
- **Last reviewed**:

## 1) Threat model (light)
- **Assets**: (z. B. Nutzerkonten, Projekte, Scan-Ergebnisse, Screenshots/Videos, Share-Tokens, API Keys)
- **Attackers**: anonymous | authenticated user | shared-link recipient | admin-key holder
- **Primary abuse paths**:
  - IDOR (resourceId belongs to another user)
  - token enumeration (share token guessing)
  - SSRF (server fetches internal resources)
  - cost-exhaustion (LLM/SERP abuse)
  - data exfiltration (screenshots, scan excerpts)

## 2) Security checks (evidence required)
### 2.1 AuthN/AuthZ
- **Auth required?** yes/no
- **How enforced?** (`getRequestUser`, share-token scope, admin bearer key)
- **Object ownership checks**: verified for every `id` and `projectId`
- **IDOR tests**: present? link to test(s)

### 2.2 Input validation
- **Schema**: zod / manual; link to `lib/api-schemas.ts` usage
- **Limits**: lengths, enums, arrays, pagination bounds
- **Sanitization**: HTML/text, URLs, file paths

### 2.3 Rate limiting / Abuse controls
- **Keying**: userId / ip / token
- **Budgets**: request/min, burst
- **Costly ops protected**: LLM/SERP/domain-scan

### 2.4 SSRF / outbound fetch hygiene
- **URL allow/deny rules**:
  - block private ranges (127.0.0.1, 10/8, 172.16/12, 192.168/16, link-local)
  - limit redirects
  - timeouts + max response size
- **Evidence**: link to implementation and tests

### 2.5 Secrets / logging / PII
- **Secrets only via env**: ok / not ok
- **Logs**: no tokens/PII; redaction policy
- **Retention**: what stored (excerpt/screenshot/video), how long, deletion path

## 3) Performance checks (evidence required)
### 3.1 Request budgets
- **Target latency**: p50/p95 goals
- **Timeouts**: external calls, DB, LLM
- **Retries/backoff**: idempotency safe?

### 3.2 DB efficiency
- **Queries per request**: expected
- **Pagination**: enforced on list endpoints
- **Indices**: needed? documented?
- **Evidence**: query traces or test fixtures

### 3.3 Caching
- **Cacheable?** yes/no
- **Key**:
- **Invalidation**:
- **Stale strategy**:

## 4) Standards / Quality
- **API error shape**: uses `apiError/internalError` with `API_STATUS`
- **i18n**: keys exist for user-facing UI strings
- **Observability**: structured logs + `reportUsage` where applicable
- **Tests**:
  - unit tests (pure libs)
  - integration tests (routes) with mocks

## 5) Findings & actions
### Findings
- [ ] Finding 1 (severity: low/med/high) + evidence link
- [ ] Finding 2

### Actions (DoD)
- [ ] Fix + add test
- [ ] Validate with `npm run build` + relevant test suite

## 6) Evidence links
- Code links (files + key lines)
- Test output / commands
- Logs/metrics snapshots (if available)

