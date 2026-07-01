# CHECKION – Docker-Start / Coolify Logs

## Migration 0004: `run-migration-0004.mjs` fehlt

```
Error: Cannot find module '/app/scripts/run-migration-0004.mjs'
```

**Ursache:** Runner-Image kopierte das Script nicht (nur `lib/` + einzelne `scripts/*.ts`).

**Fix:** `Dockerfile` kopiert `scripts/run-migration-0004.mjs`. Entrypoint prüft zusätzlich, ob die Datei existiert.

## `revalidateTag` / static generation store missing

Beim optionalen Start-Sync `sync-domain-scan-tags-from-projects.ts` **vor** `next start`.

**Fix:** `lib/cache.ts` → `safeRevalidateTag()` ignoriert diesen Fehler außerhalb des Next-Kontexts. DB-Sync bleibt wirksam.

## GEO/E-E-A-T: Navigation timeout 60000 ms

```
GEO/E-E-A-T run failed: Navigation timeout of 60000 ms exceeded
```

**Ursache:** `networkidle2` erreicht auf SPAs mit dauernden Requests (Analytics, CMP) oft kein Idle — besonders im Container.

**Fix:** `lib/scan-goto.ts` → Fallback auf `domcontentloaded` + kurze Settle-Zeit.

**Optional:** `SCAN_NAVIGATION_TIMEOUT_MS=90000` (oder höher) in Coolify setzen.

## Redis `ENOTFOUND` / `The client is closed`

```
getaddrinfo ENOTFOUND … Fix REDIS_URL / DNS / firewall, unset REDIS_URL, or set CHECKION_DISABLE_REDIS_RATE_LIMIT=1
```

**Kein App-Crash** — Fallback auf In-Memory Rate Limits.

**Coolify:**

- `REDIS_URL` auf den **internen** Redis-Host setzen (z. B. `redis://redis:6379`), oder
- `REDIS_URL` entfernen, oder
- `CHECKION_DISABLE_REDIS_RATE_LIMIT=1`

Siehe `knowledge/checkion-redis-rate-limit.md`.

## Nach Deploy

Neues Image bauen und deployen — die Logs vom **26.06. 12:10** zeigen noch den Stand **vor** den Fixes (cache.ts Zeile 229 ohne `safeRevalidateTag`).
