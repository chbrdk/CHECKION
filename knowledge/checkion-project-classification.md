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
