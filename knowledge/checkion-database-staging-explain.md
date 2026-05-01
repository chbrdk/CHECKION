# CHECKION – Staging: langsame Queries finden (EXPLAIN)

Kurzanleitung, wenn ihr **viele Zeilen** oder **spürbare Latenz** in der Postgres-API habt.

## 1. Reproduzierbare Last

- Gleiche **URL + Auth** wie in Produktion (oder anonymisierte Kopie der DB).
- In `psql` oder einem SQL-Client mit Leserechten auf die CHECKION-DB.

## 2. Kandidaten-Queries

Typische Hotspots:

- Listen über **`domain_pages`** / **`domain_scans`** mit Filter auf `user_id`, `domain_scan_id`
- **`domain_page_issues`** / **`domain_issue_groups`** mit den bestehenden Indexen aus `lib/db/migrations/0012_domain_issue_indexes.sql`

## 3. EXPLAIN ANALYZE

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT ... -- eure konkrete Query aus Drizzle/log
;
```

- **Seq Scan** auf großen Tabellen bei selektiven `WHERE` → fehlender oder unpassender **Index**.
- **Rows Removed by Filter** hoch → Predicate passt nicht zum Index.
- **Buffers: shared hit** vs **read** → Cache-Warmth; auf Staging mehrfach laufen lassen.

## 4. Index nur bei Bedarf

Neue Indexe erhöhen **Schreib- und Speicherkosten**. Erst messen, dann z. B. in einer Migration unter `lib/db/migrations/` ergänzen und mit `EXPLAIN` vergleichen.

## Verweise

- Schema: `lib/db/schema.ts`
- Bestehende Issue-Indexe: `lib/db/migrations/0012_domain_issue_indexes.sql`
