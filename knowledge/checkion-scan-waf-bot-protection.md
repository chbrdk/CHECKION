# Scan access blocks (429, Cloudflare, WAF)

## Symptoms

- **HTTP 429** on sites like [schreiner-group.com](https://schreiner-group.com) — target WAF/rate limit, not CHECKION’s API rate limit.
- **Cloudflare “Are you a bot?”** — interactive challenge; headless may not pass without human interaction.

## Mitigations (CHECKION)

| Layer | Module | Behavior |
|-------|--------|----------|
| Browser fingerprint | `lib/scan-browser-profile.ts` | Modern Chrome UA, `Accept-Language`, hide `navigator.webdriver`, `--disable-blink-features=AutomationControlled` |
| Host politeness | `lib/scan-host-politeness.ts` | Min gap between navigations to same host (default 2s, `SCAN_HOST_MIN_DELAY_MS`) |
| Navigation retries | `lib/scan-goto.ts` | Retry 429/502/503/403 with `Retry-After` / backoff; wait for challenge pages |
| Bot detection | `lib/scan-bot-guard.ts` | Detect “Just a moment”, `#challenge-form`, wait up to `SCAN_BOT_CHALLENGE_WAIT_MS` (45s) |
| Domain crawl | `lib/spider.ts` | Default concurrency **3** (was 12) — `DOMAIN_SCAN_CONCURRENCY` |

## Env tuning (Coolify / `.env`)

```bash
SCAN_HOST_MIN_DELAY_MS=3000
SCAN_NAVIGATION_MAX_RETRIES=4
SCAN_NAVIGATION_RETRY_BASE_MS=5000
SCAN_BOT_CHALLENGE_WAIT_MS=45000
DOMAIN_SCAN_CONCURRENCY=2
```

## Limits

- **Hard Cloudflare Turnstile** may still block datacenter IPs — no reliable bypass without residential proxy or allowlisting CHECKION egress IP.
- CHECKION API `429` (`Too many requests` from `/api/scan`) is separate — see `RATE_LIMIT_SCAN_MAX`.

## Tests

- `__tests__/lib/scan-bot-guard.test.ts`
- `__tests__/lib/scan-host-politeness.test.ts`
- `__tests__/lib/scan-goto.test.ts`
