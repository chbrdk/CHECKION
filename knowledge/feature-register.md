## Checkion Feature Register (Security/Performance/Standards)

Dieses Register ist die **Source of Truth**, welche Funktionen/Integrationen existieren und **wie** wir sie auditen.

### Risk Labels
- **P0**: öffentlich erreichbar / auth-kritisch / externe Calls (SSRF) / LLM-Kosten / Daten-Exfiltration
- **P1**: performance-kritische User-Flows (Dashboard, große Listen, häufige Refreshes)
- **P2**: niedriges Risiko (Tools, Checks), trotzdem Standards + Timeouts + Rate Limits prüfen

---

## P0 (Audit zuerst)

### Public Share (Token-basiert, ohne Login)
- **API**:
  - `app/api/share/route.ts`
  - `app/api/share/[token]/route.ts`
  - `app/api/share/[token]/access/route.ts`
  - `app/api/share/[token]/pages/[pageId]/route.ts`
  - `app/api/share/[token]/pages/[pageId]/screenshot/route.ts`
  - `app/api/share/[token]/video/route.ts`
  - `app/api/share/by-resource/route.ts`
- **UI**:
  - `app/share/[token]/page.tsx`
- **Risiko-Fokus**:
  - Token-Entropie/Enumeration, `expires_at`, Resource-Scope (single/domain), PII-Leakage
  - Zugriff auf Screenshots/Videos (sensitive data)

### Auth & Admin
- **API**:
  - `app/api/auth/[...nextauth]/route.ts`
  - `app/api/auth/register/route.ts`
  - `app/api/auth/profile/route.ts`
  - `app/api/auth/change-password/route.ts`
  - `app/api/auth/tokens/route.ts`
  - `app/api/auth/tokens/[id]/route.ts`
  - `app/api/admin/users/route.ts`
  - `app/api/admin/users/[id]/route.ts`
- **Libs**:
  - `lib/plexon-auth.ts`
  - `lib/auth-admin-api.ts`
  - `lib/auth-api-token.ts`
  - `lib/rate-limit.ts`
- **Risiko-Fokus**:
  - IDOR (tokenId/userId), Admin Bearer Key, Password Policy, Session/JWT settings

### Scan Pipeline (Outbound Fetch / SSRF / Storage)
- **API**:
  - `app/api/scan/route.ts`
  - `app/api/scan/[id]/route.ts`
  - `app/api/scan/[id]/screenshot/route.ts`
  - `app/api/scan/domain/route.ts`
  - `app/api/scan/domain/by-domain/route.ts`
  - `app/api/scan/domain/[id]/status/route.ts`
  - `app/api/scan/domain/[id]/summary/route.ts`
  - `app/api/scan/domain/[id]/summarize/route.ts`
  - `app/api/scan/domain/[id]/journey/route.ts`
  - `app/api/scan/[id]/project/route.ts`
- **Libs**:
  - `lib/scanner.ts`
  - `lib/domain-scan-start.ts`
  - `lib/domain-scan-classify.ts`
  - `lib/db/scans.ts`
- **Risiko-Fokus**:
  - SSRF-Schutz, Redirects, Timeouts, Concurrency, Payload truncation, object storage access

### LLM / Cost Controls / Prompt Injection
- **Page Tier Classification (Claude Haiku)**:
  - `app/api/scan/[id]/classify/route.ts`
  - `app/api/scan/domain/[id]/classify/route.ts`
  - `lib/llm/page-classification.ts`
  - `lib/llm/config.ts`
- **Summaries / UX Check**:
  - `app/api/scan/[id]/summarize/route.ts`
  - `app/api/scan/domain/[id]/summarize/route.ts`
  - `app/api/scan/[id]/ux-check/route.ts`
  - `lib/llm/ux-check-agent.ts`
- **GEO/EEAT**:
  - `app/api/scan/geo-eeat/route.ts`
  - `app/api/scan/geo-eeat/suggest-competitors-queries/route.ts`
  - `app/api/scan/geo-eeat/[jobId]/route.ts`
  - `app/api/scan/geo-eeat/[jobId]/status/route.ts`
  - `app/api/scan/geo-eeat/[jobId]/project/route.ts`
  - `app/api/scan/geo-eeat/[jobId]/rerun-competitive/route.ts`
  - `app/api/scan/geo-eeat/[jobId]/competitive-history/route.ts`
  - `app/api/scan/geo-eeat/[jobId]/competitive-history/[runId]/route.ts`
  - `app/api/scan/geo-eeat/history/route.ts`
- **Projekt-spezifische AI Helpers**:
  - `app/api/projects/[id]/research/route.ts`
  - `app/api/projects/[id]/suggest-competitors/route.ts`
  - `app/api/projects/[id]/suggest-keywords/route.ts`
- **Risiko-Fokus**:
  - token budgets (`max_tokens` / model-specific), rate limiting, redaction, JSON schema parsing robustness

---

## P1 (Performance zuerst)

### Projects Dashboard + Summaries
- **API**:
  - `app/api/projects/route.ts`
  - `app/api/projects/[id]/route.ts`
  - `app/api/projects/[id]/ranking-summary/route.ts`
  - `app/api/projects/[id]/geo-summary/route.ts`
  - `app/api/projects/[id]/domain-summary/route.ts`
  - `app/api/projects/[id]/domain-summary-all/route.ts`
  - `app/api/projects/[id]/domain-scan-all/route.ts`
  - `app/api/projects/[id]/geo-question-history/route.ts`
  - `app/api/projects/[id]/geo-latest-result/route.ts`
- **UI**:
  - `app/projects/[id]/page.tsx`
  - `app/projects/[id]/rankings/page.tsx`
  - `app/projects/[id]/geo/page.tsx`
  - `app/projects/[id]/research/page.tsx`
- **Fokus**:
  - DB Query Efficiency, Caching/Invalidation, payload sizes, pagination

### Rank Tracking Refresh (External SERP calls)
- **API**:
  - `app/api/rank-tracking/refresh/route.ts`
  - `app/api/rank-tracking/keywords/route.ts`
  - `app/api/rank-tracking/keywords/[id]/route.ts`
  - `app/api/rank-tracking/keywords/[id]/positions/route.ts`
- **Libs**:
  - `lib/serp-api.ts`, `lib/serp-markets.ts`, `lib/external-apis.ts`
  - `lib/db/rank-tracking-keywords.ts`, `lib/db/rank-tracking-positions.ts`
- **Fokus**:
  - batching, retries/backoff, external timeout, per-user quota, DB indices

---

## P2 (Utilities)
- **Checks**: `app/api/checks/**` (pagespeed/ssl/readability/wayback/contrast)
- **Tools**: `app/api/tools/**` (readability/extract/ssl-labs/wayback/contrast/pagespeed)
- **Search**: `app/api/search/route.ts`
- **Health**: `app/api/health/route.ts`

---

## Audit status (to be filled)
Für jede Feature-ID wird eine Datei unter `knowledge/audits/<feature-id>.md` angelegt.

