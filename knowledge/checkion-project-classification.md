# Projekt- & Deep-Scan-Klassifizierung

## Datenbank

- **`projects`**: `industry` (text, optional), `tags` (jsonb `string[]`, normalisiert).
- **`domain_scans`**: `tags` (jsonb `string[]`) für Scan-spezifische Tags.

Migration: `lib/db/migrations/0014_project_industry_domain_scan_tags.sql`.

## Normalisierung (`lib/tag-utils.ts`)

- Tags: lowercase, `[a-z0-9_-]+`, max 48 Zeichen, max 32 Tags pro Entität.
- Branche: trim, max 128 Zeichen (`normalizeIndustry`).

## Filter (Deep-Scan-Liste)

`GET /api/scans/domain?industry=&tag=` — `tag` matcht, wenn der Tag in **Scan-Tags** oder **Projekt-Tags** vorkommt. Liste joined `projects` in der Lineage-Subquery, damit der „neueste Kopf“ pro Lineage korrekt gefiltert wird.

## APIs

- `PATCH /api/projects/[id]` — `industry`, `tags`; triggert `invalidateDomainList`.
- `PATCH /api/scans/domain/[id]/tags` — nur Owner: Scan-Tags setzen.

## Backfill: alle Domain-Scans mit Projekt-Tags abgleichen

Einmalig oder nach Migration: **`POST`** `API_ADMIN_DOMAIN_SCANS_SYNC_PROJECT_TAGS` (`lib/constants.ts` → `/api/admin/domain-scans/sync-project-tags`).

- **Auth:** `Authorization: Bearer <CHECKION_ADMIN_API_KEY>` (Key min. 16 Zeichen, sonst lehnt der Server alle Admin-Requests ab).
- **Body:** optional JSON. Leerer Body ist gültig und entspricht `{}`.
- **`mode`** (optional, Default `replaceFromProject`):
  - **`replaceFromProject`** — jeder Domain-Scan mit `project_id` erhält die **Projekt-Tags** (überschreibt bestehende Scan-Tags).
  - **`fillEmpty`** — nur Zeilen, bei denen Scan-Tags leer sind und Projekt-Tags nicht, werden befüllt.

**Hinweis:** `industry` liegt nur auf `projects`; dieser Job kopiert nur `tags` auf `domain_scans`. Branche erscheint in Listen/Filtern weiter über den Join.

Nach dem Lauf werden die Domain-Listen-Caches aller Nutzer mit mindestens einem Domain-Scan invalidiert.

**Docker / Coolify:** statt HTTP kann derselbe Lauf beim Container-Start per Env erfolgen — siehe `knowledge/checkion-docker-sync-domain-scan-tags.md` (`CHECKION_SYNC_DOMAIN_SCAN_TAGS_ON_START`, optional `CHECKION_SYNC_DOMAIN_SCAN_TAGS_MODE`).

**Beispiel:**

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $CHECKION_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"mode":"replaceFromProject"}' \
  "$BASE_URL/api/admin/domain-scans/sync-project-tags"
```

(`$BASE_URL` ggf. inkl. `NEXT_PUBLIC_APP_BASE_URL`-Präfix, siehe `APP_BASE_URL` in `lib/constants.ts`.)
