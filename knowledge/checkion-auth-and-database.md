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
- **Profil (Settings):** Wenn PLEXON konfiguriert ist, liefern **GET /api/auth/profile** und **PATCH /api/auth/profile** die Daten aus PLEXON (Name, Unternehmen, Avatar, Sprache). Änderungen werden in PLEXON gespeichert und sind damit zentral für alle Dienste.
- **`default_platform_company_id`:** Das PLEXON-Service-Profil kann diese ID mitschicken; CHECKION gibt sie im Profil-JSON durch. **POST /api/projects** nutzt sie serverseitig, wenn der Client keine **`platformCompanyId`** sendet (analog zu AUDION): zuerst optionaler Body, dann Query `platformCompanyId` / `platform_company_id`, dann Profil-Fetch per `user_id`. Die Seite **`/projects`** spiegelt URL, `sessionStorage` (`checkion_platform_company_id`), `NEXT_PUBLIC_DEFAULT_PLATFORM_COMPANY_ID` und Profil-Default — und schreibt den Profil-Default in die Session, wenn noch kein Tab-Kontext gesetzt ist.
- **Registrierung:** Wenn `PLEXON_AUTH_URL` und `PLEXON_SERVICE_SECRET` gesetzt sind, legt **`POST /api/auth/register`** den User per **`POST {PLEXON}/api/auth/register`** in PLEXON an (öffentlicher Endpoint, kein Service-Secret) und **schreibt keinen** CHECKION-`users`-Datensatz mehr; Antwort `{ success, userId, plexon: true }`. Sonst bleibt die lokale Registrierung mit Passwort-Hash in CHECKION.
- **Passwort vergessen:** Passwort liegt in PLEXON. Mit `NEXT_PUBLIC_PLEXON_REGISTER_URL` zeigt die Login-Seite **„Passwort vergessen?“** → `{Origin}/forgot-password` (`getPlexonForgotPasswordUrl()` in `lib/plexon-links.ts`). Reset-Flow und E-Mail-Versand sind in PLEXON implementiert (`/forgot-password`, `/reset-password`, APIs unter `/api/auth/request-password-reset` und `/api/auth/reset-password`).
- Optional: `NEXT_PUBLIC_PLEXON_REGISTER_URL` setzen, dann erscheint auf der Register-Seite zusätzlich „In PLEXON registrieren“.

### Alternative: Gemeinsame DB

- Statt Auth-API: `DATABASE_URL` in CHECKION auf dieselbe PostgreSQL wie PLEXON setzen. Dann nutzt CHECKION die gleiche `users`-Tabelle (Login wie bisher). Eine DB für alles; für getrennte DBs die Auth-API nutzen.

## Migration bestehender User nach PLEXON

Falls CHECKION bereits Nutzer in einer eigenen `users`-Tabelle hat:

1. **User nach PLEXON kopieren:**
   - **Automatisch (Coolify/Docker):** Bei der PLEXON-Application `MIGRATION_SOURCE_DATABASE_URL` auf die CHECKION-DB-URL setzen. Beim nächsten Container-Start führt PLEXON die Migration aus (idempotent). Siehe `knowledge/coolify-vollstaendige-anleitung.md`.
   - **Manuell:** Im PLEXON-Projekt `MIGRATION_SOURCE_DATABASE_URL` (CHECKION-DB) und `DATABASE_URL` (PLEXON-DB) setzen, dann `npm run migrate:checkion-users` oder `node scripts/migrate-checkion-users-to-plexon.mjs` ausführen. Die User-IDs bleiben unverändert.
2. **CHECKION auf PLEXON-Auth umstellen:** `PLEXON_AUTH_URL` und `PLEXON_SERVICE_SECRET` in CHECKION setzen. Ab dann erfolgt der Login über die PLEXON-API; die CHECKION-DB kann weiterhin nur App-Daten (Scans, Projekte) enthalten.
