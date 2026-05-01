# CHECKION – Datenbank-Skalierung & große Datenmengen

**Stand:** Architektur-Review (Schema `lib/db/schema.ts`, Zugriff `lib/db/*.ts`).

## Was bereits gut passt

- **Normalisierte Hochvolumen-Daten:** `domain_pages`, `domain_page_issues`, `domain_issue_groups` entlasten `domain_scans.payload` – Listen und Issues kommen aus Tabellen statt aus einem riesigen JSONB (`schema`-Kommentare + `domain-slim-pages.ts`).
- **Indexes für Issues:** Migration `0012_domain_issue_indexes.sql` (u. a. `(domain_scan_id, user_id)`, Gruppierung nach `group_key`, Sortierung nach `page_count`).
- **API-seitige Pagination:** Slim-/SEO-Tabellen mit `limit`/`offset` und Server-Caps (siehe `lib/constants.ts`).

## Typische Engpässe bei „zigtausend“ Zeilen

| Problem | Symptom | Richtung |
|--------|---------|----------|
| **Große JSONB** (`scans.result`, `domain_scans.payload`) | Hoher Speicher pro Request, langsame IO | Nur projizierte Spalten laden (`select({ id, url, … })`), schwere Felder nur bei Detail-Views |
| **`OFFSET` bei sehr großen Offsets** | Postgres muss viele Zeilen „überspringen“ | Keyset-Pagination (`WHERE (sort_col, id) > ($cursor, $id)`) für tiefe Seiten optional ergänzen |
| **Connection Pool** | Wartezeiten unter Last | `Pool`-`max` aus Env (aktuell fest `10` in `lib/db/index.ts`) + Monitoring |
| **Listen ohne passenden Index** | Seq Scans auf `domain_scans` / `scans` | Indexe auf `(user_id, …)` passend zu euren häufigsten `WHERE`/`ORDER BY`-Queries prüfen (Explain Analyze) |
| **Rate limiting im RAM** | Bei mehreren App-Instanzen inkonsistent | Redis / Upstash (bereits in `lib/rate-limit.ts` erwähnt) |

## Empfohlene nächste Schritte (priorisiert)

1. **Messbar machen:** Langsame Queries mit `EXPLAIN (ANALYZE, BUFFERS)` auf Staging mit anonymisierten Produktionsdatenmengen.
2. **Projektionen:** Alle Hot-Pfade, die noch `db.select().from(table)` ohne Spalten nutzen, auf schmale `select({ … })` umstellen.
3. **Pool-Konfiguration:** `DATABASE_POOL_MAX` (Standard 10, Grenzen 1–100) steuert `pg` Pool `max` — siehe `lib/db/pool-config.ts`, `ENV_DATABASE_POOL_MAX` in `lib/constants.ts`.
4. **Optional Keyset:** Für Domain-Slim/SEO/Issue-Listen ab „Seite 50+“ eine Cursor-Variante der API (gleiche Sortkeys, stabiler Tie-Breaker `id`).
5. **Langzeit-Wachstum:** `rank_tracking_positions` und Roh-Issues wachsen mit der Zeit – Archivierung oder Partitioning nach Monat nur wenn Metriken das zeigen.

## Referenzen im Repo

- Schema: `lib/db/schema.ts`
- Domain-Paging: `lib/db/domain-slim-pages.ts`, `lib/db/domain-seo-pages.ts`, `lib/db/domain-issues.ts`
- Migrationen: `lib/db/migrations/`
