# CHECKION – Projekte-Feature

## Übersicht

Projekte gruppieren Scans und Analysen pro Kunde/Domain. Scans können weiterhin ohne Projekt gestartet werden; optional kann beim Start ein Projekt gewählt oder nachträglich zugewiesen werden.

## Datenmodell

- **Tabelle `projects`**: `id`, `user_id`, `name`, `domain`, `created_at`, `updated_at`
- **Optionale Spalte `project_id`** (nullable, FK → projects.id, ON DELETE SET NULL) in:
  - `scans`
  - `domain_scans`
  - `journey_runs`
  - `geo_eeat_runs`

## Migration

- Migration: `lib/db/migrations/0002_projects.sql`
- Nach Schema-Änderung: `npx drizzle-kit generate` (falls neu), dann Migration gegen die DB ausführen (z. B. `npx drizzle-kit push` oder manuell die SQL-Datei).

## API

- **GET/POST** `/api/projects` – Liste / Anlegen
- **GET/PATCH/DELETE** `/api/projects/[id]` – Detail, Bearbeiten, Löschen (setzt projectId bei Ressourcen auf null)
- **PATCH** `/api/scan/[id]/project` – Single-Scan zuordnen (body: `{ projectId: string | null }`)
- **PATCH** `/api/scans/domain/[id]/project` – Domain-Scan zuordnen
- **PATCH** `/api/scan/journey-agent/[jobId]/project` – Journey-Run zuordnen
- **PATCH** `/api/scan/geo-eeat/[jobId]/project` – GEO/E-E-A-T-Run zuordnen

Listen-Endpunkte (GET) unterstützen optionalen Query-Parameter `projectId` zur Filterung.

## Frontend

- **Seiten**: `/projects` (Liste), `/projects/[id]` (Detail mit Tabs: Domain-Scans, Journeys, GEO-Runs, Single-Scans)
- **Komponente**: `AddToProject` – Menü „Zu Projekt hinzufügen“ / „Projekt ändern“ auf Ergebnis-Seiten (Single, Domain, Journey, GEO)
- **Scan-Start**: Optionale Projektauswahl auf `/scan` (alle Modi: Single, Deep, Journey, GEO)

## i18n

- Namespace `projects.*` und `nav.projects` in `locales/de.json` und `locales/en.json`.
