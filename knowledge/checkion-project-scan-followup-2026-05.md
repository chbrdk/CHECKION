# CHECKION – Audit-Umsetzung (2026-05)

Kurzreferenz aus dem Projekt-Scan-Follow-up.

## Umgesetzt

- **Repo-Hygiene:** `Trace-*.json`, `.cursor/debug*.log`, `.specstory/` nicht mehr versioniert; `.gitignore` ergänzt.  
- **Debug-Skripte:** `debug_focus.ts` / `debug_ux_metrics.ts` → `scripts/debug-focus.ts` / `scripts/debug-ux-metrics.ts`.  
- **Tote API entfernt:** `buildDomainBundleForUser`, `DOMAIN_SLIM_PAGES_CHUNK`, `DOMAIN_SLIM_PAGES_MAX_CLIENT` (nur noch in `constants` referenziert, keine Aufrufer).  
- **Logging:** Scanner (`lib/scanner.ts`) und Journey-Agent (`lib/llm/journey-agent.ts`) verbose Logs nur bei `CHECKION_SCAN_DEBUG=1|true|yes` (`lib/scan-debug-log.ts`, Konstantenname `ENV_CHECKION_SCAN_DEBUG` in `lib/constants.ts`).  
- **Rate limiting:** Zwei Buckets in `lib/rate-limit.ts`: `default` (Scan-APIs, wie bisher) und `register` (POST `/api/auth/register` pro IP). Env: `RATE_LIMIT_REGISTER_MAX`, `RATE_LIMIT_REGISTER_WINDOW_MS`. Hilfsfunktion `getClientIpForRateLimit`.  
- **`.env.example`:** Zentrale Dokumentation der Variablen (committed via `!.env.example` in `.gitignore`).  

## Redis / Multi-Instanz

Rate Limits sind weiterhin **pro Node-Prozess**. Für horizontal skalierte Deployments Redis (@upstash/ratelimit) siehe Kommentar in `lib/rate-limit.ts`.
