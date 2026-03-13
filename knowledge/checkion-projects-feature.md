# CHECKION – Projekte-Feature

## Übersicht

Projekte gruppieren Scans und Analysen pro Kunde/Domain. Scans können weiterhin ohne Projekt gestartet werden; optional kann beim Start ein Projekt gewählt oder nachträglich zugewiesen werden.

## Datenmodell

- **Tabelle `projects`**: `id`, `user_id`, `name`, `domain`, `competitors` (jsonb string[]), `geo_queries` (jsonb string[]), `created_at`, `updated_at`
- **Competitors**: Single source of truth for competitor domains. Used by rank tracking (SERP comparison) and can pre-fill GEO/E-E-A-T competitive runs. Editable on the project detail page; optional "Suggest with AI" (POST `/api/projects/[id]/suggest-competitors`) uses project domain/name to suggest competitors and queries via LLM.
- **geo_queries**: Stored GEO/E-E-A-T search queries for this project; editable on project detail page; can be suggested via suggest-competitors (returns `queries`) and used to pre-fill GEO runs.
- **Optionale Spalte `project_id`** (nullable, FK → projects.id, ON DELETE SET NULL) in:
  - `scans`
  - `domain_scans`
  - `journey_runs`
  - `geo_eeat_runs`

## Migration

- Migrations: `lib/db/migrations/0002_projects.sql`, `0007_project_competitors_and_position_competitors.sql`, `0008_project_geo_queries.sql`
- Nach Schema-Änderung: `npx drizzle-kit generate` (falls neu), dann Migration gegen die DB ausführen (z. B. `npx drizzle-kit push` oder manuell die SQL-Datei).

## API

- **GET/POST** `/api/projects` – Liste / Anlegen
- **GET/PATCH/DELETE** `/api/projects/[id]` – Detail, Bearbeiten (name, domain, competitors, geoQueries), Löschen (setzt projectId bei Ressourcen auf null)
- **POST** `/api/projects/[id]/suggest-competitors` – AI suggests competitor domains and GEO queries (uses project domain or body `url`). Returns `{ competitors: string[], queries: string[] }`; frontend can merge competitors or queries into project and PATCH.
- **POST** `/api/projects/[id]/suggest-keywords` – AI suggests SEO keywords for rank tracking (uses project domain/name). Returns `{ keywords: string[] }`; frontend lets user select and add to rank-tracking keywords.
- **POST** `/api/projects/[id]/research` – Project research agent: one LLM run with OpenAI Structured Outputs (JSON schema). Returns `{ targetGroups, valueProposition?, seoKeywords, geoQueries, competitors }`. Uses `gpt-4o-mini` (or `OPENAI_SUGGEST_MODEL`). Frontend shows result in a Research card; user can edit and apply categories to project (competitors, geoQueries, rank keywords).
- **PATCH** `/api/scan/[id]/project` – Single-Scan zuordnen (body: `{ projectId: string | null }`)
- **PATCH** `/api/scans/domain/[id]/project` – Domain-Scan zuordnen
- **PATCH** `/api/scan/journey-agent/[jobId]/project` – Journey-Run zuordnen
- **PATCH** `/api/scan/geo-eeat/[jobId]/project` – GEO/E-E-A-T-Run zuordnen

Listen-Endpunkte (GET) unterstützen optionalen Query-Parameter `projectId` zur Filterung.

## Frontend

- **Seiten**: `/projects` (Liste), `/projects/[id]` (Detail: card-based layout, MSQDX only)
- **Projekt-Detail** (`/projects/[id]`): Six cards in a vertical stack (no tabs):
  1. **Company info** (MsqdxCard): Project name, domain.
  2. **Projekt-Research** (MsqdxMoleculeCard): "Research starten" runs POST `/api/projects/[id]/research`. Result shown as editable categories (target groups, value proposition, SEO keywords, GEO queries, competitors). Per-category add/remove chips; "Apply to competitors", "Apply to GEO queries", "Apply as rank keywords" merge into project.
  3. **Competitors** (MsqdxMoleculeCard): Input + Add, "Suggest with AI"; list as MsqdxChip with onDelete.
  4. **Keywords (Rank-Tracking)** (MsqdxMoleculeCard): Add keyword (dialog), "Suggest keywords with AI" (calls suggest-keywords; user selects chips and "Add selected"); Refresh rankings; list with last position and competitor positions.
  5. **GEO-Fragen** (MsqdxMoleculeCard): Stored queries as MsqdxChip; input + Add, "Suggest with AI" (calls suggest-competitors and merges `queries` into project.geoQueries).
  6. **Aktivität** (MsqdxMoleculeCard): MsqdxAccordion with Domain Scans, Journey Runs, GEO Runs, Single Scans; each section lists items and empty-state CTA.
- **Komponente**: `AddToProject` – Menü „Zu Projekt hinzufügen“ / „Projekt ändern“ auf Ergebnis-Seiten (Single, Domain, Journey, GEO)
- **Scan-Start**: Optionale Projektauswahl auf `/scan` (alle Modi: Single, Deep, Journey, GEO)

## i18n

- Namespace `projects.*` und `nav.projects` in `locales/de.json` und `locales/en.json`.
