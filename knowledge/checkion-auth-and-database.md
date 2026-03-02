# CHECKION – Auth & Datenbank

## Übersicht
- **Datenbank:** PostgreSQL (Drizzle ORM, `pg`-Driver)
- **Auth:** NextAuth v5 mit Credentials-Provider (E-Mail + Passwort), JWT-Session

## Tabellen
- **users:** id, email, password_hash, name, company, avatar_url, locale, created_at (timestamptz)
- **scans:** id, user_id, url, device, group_id, timestamp, result (jsonb)
- **domain_scans:** id, user_id, domain, status, timestamp, payload (jsonb)

Scans und Domain-Scans sind immer einem User zugeordnet (`user_id`). API-Routen liefern nur Daten des eingeloggten Users (401 ohne Session).

## Schema anlegen
Nach dem Erstellen der Datenbank Tabellen anlegen mit:
```bash
npx drizzle-kit push
```
(erfordert `DATABASE_URL` in `.env`)

## Umgebung
- `AUTH_SECRET`: Pflicht für NextAuth (z. B. `npx auth secret`)
- `DATABASE_URL`: Pflicht, z. B. `postgresql://user:password@localhost:5432/checkion` (Neon, Supabase, Railway, etc.)

## Routen
- **POST /api/auth/register** – Registrierung (email, password, name optional)
- **POST /api/auth/callback/credentials** – Login (über NextAuth signIn)
- **GET/POST /api/scan** – nur mit Auth; Scans werden in der DB gespeichert und nach User gefiltert

## Middleware
- Schützt `/`, `/scan`, `/results`, `/domain`, `/settings` – ohne Session Redirect auf `/login`
- `/login` und `/register` sind öffentlich; mit Session Redirect auf `/`

## Session-Cookie
- Name: `authjs.session-token` (NextAuth v5)
- Middleware prüft nur Cookie-Anwesenheit (kein DB-Zugriff im Edge)

## Zentrale Auth über PLEXON (empfohlen: getrennte DBs)

- **PLEXON-DB nur für User:** PLEXON hat die einzige User-Datenbank (klein). CHECKION kann eine **eigene** DB nur für Scans, Projekte, Domain-Scans usw. haben – keine riesige gemeinsame DB.
- **Login über API:** Setze `PLEXON_AUTH_URL` (z. B. `https://plexon.example.com`) und `PLEXON_SERVICE_SECRET` (gleich wie in PLEXON). Beim Login ruft CHECKION `POST /api/auth/validate-credentials` auf; PLEXON prüft E-Mail/Passwort und liefert `{ user: { id, email, name } }`. CHECKION legt die Session an und speichert in eigenen Tabellen nur die `user_id`.
- **Registrierung:** Nur in PLEXON. Optional `NEXT_PUBLIC_PLEXON_REGISTER_URL` setzen, dann erscheint auf der Register-Seite „In PLEXON registrieren“.

### Alternative: Gemeinsame DB

- Statt Auth-API: `DATABASE_URL` in CHECKION auf dieselbe PostgreSQL wie PLEXON setzen. Dann nutzt CHECKION die gleiche `users`-Tabelle (Login wie bisher). Eine DB für alles; für getrennte DBs die Auth-API nutzen.

## Migration bestehender User nach PLEXON

Falls CHECKION bereits Nutzer in einer eigenen `users`-Tabelle hat:

1. **User nach PLEXON kopieren:**
   - **Automatisch (Coolify/Docker):** Bei der PLEXON-Application `MIGRATION_SOURCE_DATABASE_URL` auf die CHECKION-DB-URL setzen. Beim nächsten Container-Start führt PLEXON die Migration aus (idempotent). Siehe `knowledge/coolify-vollstaendige-anleitung.md`.
   - **Manuell:** Im PLEXON-Projekt `MIGRATION_SOURCE_DATABASE_URL` (CHECKION-DB) und `DATABASE_URL` (PLEXON-DB) setzen, dann `npm run migrate:checkion-users` oder `node scripts/migrate-checkion-users-to-plexon.mjs` ausführen. Die User-IDs bleiben unverändert.
2. **CHECKION auf PLEXON-Auth umstellen:** `PLEXON_AUTH_URL` und `PLEXON_SERVICE_SECRET` in CHECKION setzen. Ab dann erfolgt der Login über die PLEXON-API; die CHECKION-DB kann weiterhin nur App-Daten (Scans, Projekte) enthalten.
