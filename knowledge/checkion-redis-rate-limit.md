# Redis rate limits (`REDIS_URL`)

## Verhalten

Wenn **`REDIS_URL`** gesetzt ist, nutzt CHECKION Redis für **API-Rate-Limits** (geteilte Zähler über mehrere App-Instanzen). Ohne URL oder bei anhaltenden Verbindungsfehlern: **In-Memory** pro Node-Prozess (wie früher).

## Log-Spam: `getaddrinfo EAI_AGAIN` / DNS

Das bedeutet: Der **Hostname in `REDIS_URL`** konnte im Container nicht aufgelöst werden (falscher Alias, Redis-Container heißt anders, Tippfehler, Netzwerk/DNS in Coolify).

**Abhilfe (eine Option):**

1. **`REDIS_URL` korrigieren** – z. B. in Coolify den **internen Service-Namen** nutzen, den Docker Compose / das Netz wirklich vergibt (oft `redis://redis:6379` oder der aus der Redis-Resource angezeigte Host).
2. **`REDIS_URL` entfernen** – dann nur noch In-Memory-Limits (pro Instanz getrennt; für kleine Deploys oft ok).
3. **`CHECKION_DISABLE_REDIS_RATE_LIMIT=1`** setzen – Redis für Rate-Limit **nie** ansprechen (sinnvoll, wenn die Variable gesetzt bleiben muss, der Dienst aber nicht erreichbar ist).

Optional: **`CHECKION_REDIS_RATE_LIMIT_CIRCUIT_MS`** (Millisekunden, Default 300000) – wie lange nach einem harten Fehler **kein** erneuter Redis-Versuch erfolgt; reduziert Log-Noise, Fallback bleibt In-Memory.

## Implementierung

- `lib/rate-limit-redis.ts` – Circuit-Breaker nach typischen Netz-/Auth-Fehlern, eine **WARN** pro Öffnen statt pro Reconnect-Tick.
- `lib/constants.ts` – `ENV_CHECKION_DISABLE_REDIS_RATE_LIMIT`.
