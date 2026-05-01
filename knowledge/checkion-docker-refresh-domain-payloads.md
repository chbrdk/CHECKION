# Domain-Payload-Refresh im Docker-Deployment

## Was passiert?

`scripts/refresh-domain-payloads.ts` ruft pro Domain-Scan `refreshDomainPayloadFromScans` auf: **Payload + `aggregated`** werden aus den gespeicherten Einzelseiten-Scans (`scans.group_id` = Domain-Scan-ID) neu gebaut. **Kein** Puppeteer-Crawl, **kein** LLM (keine Seitenthemen-Klassifikation).

## PLEXON / Token-Verbrauch

- Dieser Pfad **verbraucht keine LLM-Tokens**.
- Es wird **kein** `reportUsage` / PLEXON-`llm_request` ausgelöst (nur reine DB + Aggregation im Prozess).
- Tokens an PLEXON werden z. B. bei echten LLM-Routen gemeldet (`classify`, `summarize`, `domain-theme-rollup-refine`, …).

## Trigger auf dem Server (Coolify / Docker)

Im **Runner-Image** ist das Script vorhanden; der **Entrypoint** kann es optional vor `npm run start` ausführen:

| Env | Bedeutung |
|-----|-----------|
| `CHECKION_REFRESH_DOMAIN_PAYLOADS_ON_START=1` | Live-Refresh aller passenden Zeilen (Default-Filter: `status=complete`) |
| `CHECKION_REFRESH_DOMAIN_PAYLOADS_ON_START=dry-run` | Nur Auflistung, keine Writes |
| `CHECKION_REFRESH_DOMAIN_PAYLOADS_LIMIT=N` | Max. N neueste Scans |
| `CHECKION_REFRESH_DOMAIN_PAYLOADS_ALL_STATUS=1` | Kein Status-Filter (`--all-status`) |

**Empfehlung:** Nach einem Deploy die Variable **einmalig** setzen, danach wieder entfernen oder auf `0`, damit jeder Container-Neustart nicht erneut alle Scans durchläuft.

## Manuell im laufenden Container

```sh
docker exec -it <container> npx tsx scripts/refresh-domain-payloads.ts --dry-run
docker exec -it <container> npx tsx scripts/refresh-domain-payloads.ts
```

Voraussetzung: `DATABASE_URL` gesetzt (wie für die App).
