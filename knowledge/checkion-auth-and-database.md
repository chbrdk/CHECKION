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
