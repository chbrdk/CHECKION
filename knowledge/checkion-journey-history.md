# CHECKION – User-Journey speichern & Historie

User Journeys (Ziel + Agent-Ergebnis) können gespeichert und in einer Historie wieder geöffnet werden.

- **DB:** Tabelle `saved_journeys` (id, user_id, domain_scan_id, name, goal, result jsonb, created_at). Schema in `lib/db/schema.ts`, CRUD in `lib/db/journeys.ts`. Migration: `npm run db:push`.
- **API:**
  - `POST /api/journeys` – Journey speichern (Body: domainScanId, goal, result, name optional). Prüft, dass Domain-Scan dem User gehört.
  - `GET /api/journeys` – Liste (Query: domainScanId optional, limit). Join mit domain_scans für Domain-Namen.
  - `GET /api/journeys/[id]` – Einzelne gespeicherte Journey (für Restore).
  - `DELETE /api/journeys/[id]` – Löschen.
- **Domain-Seite (Journey-Tab):**
  - Nach einer durchgeführten Journey: optionaler Name + Button „Journey speichern“. Speichert über POST /api/journeys.
  - Restore: Aufruf mit `?restoreJourney=<id>` lädt die gespeicherte Journey (GET /api/journeys/[id]) und setzt Ziel, Ergebnis und wechselt in den Journey-Tab.
- **Dashboard:** Karte „Gespeicherte User Journeys“ listet Einträge (Name/Goal, Domain, Datum). „Öffnen“ → `/domain/[domainScanId]?restoreJourney=[id]`.
- **i18n:** domainResult: journeySave, journeySaving, journeySaved, journeySaveNameLabel, journeySaveNamePlaceholder, journeySaveError. dashboard: journeyHistoryTitle, journeyHistoryEmpty, journeyHistoryOpen.
