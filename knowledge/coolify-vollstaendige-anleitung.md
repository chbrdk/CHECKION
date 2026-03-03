# Coolify – Vollständige Anleitung (PLEXON + CHECKION)

Was wo in Coolify hinterlegt werden muss: Ressourcen, Umgebungsvariablen, Reihenfolge.

---

## 1. Übersicht

| Ressource      | Typ        | Zweck |
|----------------|------------|------|
| **PLEXON**     | Application| Zentrale User-Verwaltung, Login, Dashboard |
| **CHECKION**   | Application| Scans, Projekte, Domain-Analyse |
| **PostgreSQL (PLEXON)**  | Database (optional in Coolify) | Nur User-Daten (users, api_tokens) |
| **PostgreSQL (CHECKION)**| Database (optional in Coolify) | Nur App-Daten (projects, scans, domain_scans, …) |

- PLEXON und CHECKION können jeweils eine **eigene** Datenbank haben (empfohlen: PLEXON-DB klein nur für User).
- Oder eine **gemeinsame** DB (eine Connection-URL für beide); dann entfällt die Auth-API, beide nutzen dieselbe `users`-Tabelle.

---

## 2. PLEXON in Coolify

### 2.1 Neue Application anlegen

- **Quelle:** GitHub-Repo (z. B. `chbrdk/PLEXON`)
- **Build:** Dockerfile (im Repo-Root)
- **Port:** **3000** (im Dockerfile gesetzt; Coolify oft Standard 3000 → kein Extra-Port-Mapping nötig)
- **Domain:** z. B. `plexon.projects-a.plygrnd.tech` (oder deine Domain)

### 2.2 Umgebungsvariablen (PLEXON)

In Coolify unter **PLEXON** → **Environment Variables** / **Env** eintragen:

| Variable | Pflicht | Beispiel / Hinweis |
|----------|---------|---------------------|
| `AUTH_SECRET` | Ja (Production) | Min. 32 Zeichen, z. B. `npx auth secret` |
| `DATABASE_URL` | Ja (für echte User) | `postgresql://user:password@host:5432/plexon` – PLEXON-DB |
| `NEXTAUTH_URL` | Ja (Production) | **Öffentliche URL der PLEXON-App**, z. B. `https://plexon.projects-a.plygrnd.tech` |
| `PLEXON_SERVICE_SECRET` | Ja (wenn CHECKION per API login) | Min. 16 Zeichen; **derselbe Wert** wie bei CHECKION `PLEXON_SERVICE_SECRET` |
| `CHECKION_API_URL` | Optional | Wenn PLEXON-Dashboard „CHECKION-Nutzer“ anzeigen soll: `https://checkion.deine-domain.de` |
| `CHECKION_ADMIN_API_KEY` | Optional | Nur mit `CHECKION_API_URL`: Admin-API-Key von CHECKION (min. 16 Zeichen) |
| `PLEXON_DEMO_EMAIL` | Optional | Demo-Login ohne DB (nur wenn `DATABASE_URL` leer) |
| `PLEXON_DEMO_PASSWORD` | Optional | Demo-Passwort (nur mit `PLEXON_DEMO_EMAIL`) |
| `BASE_PATH` | Optional | Nur wenn Coolify einen URL-Prefix setzt (z. B. `/plexon`) |
| `MIGRATION_SOURCE_DATABASE_URL` | Optional (einmalig) | CHECKION-DB-URL; wenn gesetzt, führt der Container-Start die User-Migration (CHECKION → PLEXON) aus (idempotent) |

**Wichtig:** `NEXTAUTH_URL` muss exakt die URL sein, unter der PLEXON im Browser erreichbar ist (inkl. `https://`), sonst schlägt der Login-Callback fehl.

### 2.3 Datenbank für PLEXON (wenn in Coolify)

- Neue **PostgreSQL**-Datenbank anlegen (Coolify „Database“).
- **Connection-URL** kopieren und als `DATABASE_URL` bei der PLEXON-Application eintragen.
- Beim ersten Start führt PLEXON `drizzle-kit push` aus (Docker-Entrypoint) und legt die Tabellen an.

### 2.4 Build / Start

- **Build Command:** Standard (Dockerfile)
- **Start Command:** Standard (im Dockerfile: `./scripts/docker-entrypoint.sh` → Schema-Push, ggf. User-Migration, dann `npm run start`)
- **User-Migration automatisch:** Wenn bei PLEXON **`MIGRATION_SOURCE_DATABASE_URL`** (CHECKION-DB-URL) gesetzt ist, führt der Entrypoint beim **jeden Start** die Migration aus (idempotent: bestehende User werden aktualisiert). Nach der ersten erfolgreichen Migration kann die Variable in Coolify wieder entfernt werden, oder sie bleibt gesetzt – schadet nicht.

---

## 3. CHECKION in Coolify

### 3.1 Neue Application anlegen

- **Quelle:** GitHub-Repo (z. B. CHECKION-Repo)
- **Build:** Dockerfile (im Repo-Root)
- **Port:** **3333** (im Dockerfile gesetzt – in Coolify Port **3333** für diese App angeben, falls abweichend)
- **Domain:** z. B. `checkion.projects-a.plygrnd.tech`

### 3.2 Umgebungsvariablen (CHECKION)

In Coolify unter **CHECKION** → **Environment Variables** eintragen:

| Variable | Pflicht | Beispiel / Hinweis |
|----------|---------|---------------------|
| `DATABASE_URL` | Ja | `postgresql://user:password@host:5432/checkion` – **eigene** CHECKION-DB (nur App-Daten) |
| `AUTH_SECRET` | Ja (Production) | Min. 32 Zeichen (kann anderer Wert als PLEXON sein) |
| `NEXTAUTH_URL` | Ja (Production) | **Öffentliche URL von CHECKION**, z. B. `https://checkion.projects-a.plygrnd.tech` |
| **Zentrale Auth (PLEXON):** | | |
| `PLEXON_AUTH_URL` | Ja (wenn Login über PLEXON) | `https://plexon.projects-a.plygrnd.tech` (kein Slash am Ende) |
| `PLEXON_SERVICE_SECRET` | Ja (mit PLEXON_AUTH_URL) | **Gleicher Wert** wie in PLEXON unter `PLEXON_SERVICE_SECRET` |
| `NEXT_PUBLIC_PLEXON_REGISTER_URL` | Optional (Build-Zeit) | `https://plexon.projects-a.plygrnd.tech/register` – Link „In PLEXON registrieren“ auf der Register-Seite |
| **Admin-API (für PLEXON-Dashboard):** | | |
| `CHECKION_ADMIN_API_KEY` | Optional | Wenn PLEXON CHECKION-User anzeigen/ bearbeiten soll: langer Zufalls-String (min. 16 Zeichen) |
| **Weitere (optional):** | | |
| `OPENAI_API_KEY` | Optional | Für AI-Features (GEO, Journey, Saliency, …) |
| `DS_BASE` | Build (Docker) | Im Dockerfile gesetzt; normalerweise nicht in Coolify setzen |
| `SALIENCY_SERVICE_URL`, `UX_JOURNEY_AGENT_URL`, S3, etc. | Optional | Siehe CHECKION `.env.example` |

**Wichtig:**  
- `NEXTAUTH_URL` = exakt die CHECKION-URL.  
- `PLEXON_AUTH_URL` = exakt die PLEXON-URL (ohne trailing slash).  
- `PLEXON_SERVICE_SECRET` muss in **PLEXON** und **CHECKION** identisch sein.

### 3.3 Datenbank für CHECKION (wenn in Coolify)

- Eigene **PostgreSQL**-Datenbank für CHECKION anlegen (nur Scans, Projekte, domain_scans, …).
- **Connection-URL** als `DATABASE_URL` bei der CHECKION-Application eintragen.
- Beim Start führt CHECKION `drizzle-kit push` aus und legt die Tabellen an. Wenn ihr **nur** PLEXON-Auth nutzt, kann die `users`-Tabelle in dieser DB leer bleiben; die User liegen in PLEXON.
- **Migration 0004 (PLEXON):** Beim Start führt CHECKION automatisch die Migration `0004_drop_user_id_fk_for_plexon.sql` aus. Sie entfernt die Foreign-Key-Constraints von `user_id` auf `users`, damit Scans/Projekte etc. mit PLEXON-User-IDs gespeichert werden können, ohne dass ein Eintrag in CHECKIONs `users`-Tabelle existiert. Ohne diese Migration führt z. B. „Scan starten“ zu „Failed query: insert into scans …“ (FK-Verletzung).

### 3.4 Port in Coolify

- CHECKION exponiert **3333**. In Coolify bei der Application den Port **3333** eintragen („Port“ / „Exposed Port“), damit der Proxy auf den richtigen Container-Port zeigt.

---

## 4. Kurz-Checkliste pro App

### PLEXON

- [ ] Application mit Dockerfile, Port **3000**
- [ ] `AUTH_SECRET` (≥ 32 Zeichen)
- [ ] `DATABASE_URL` (PLEXON-PostgreSQL)
- [ ] `NEXTAUTH_URL` = öffentliche PLEXON-URL
- [ ] `PLEXON_SERVICE_SECRET` (≥ 16 Zeichen; für CHECKION-Login)
- [ ] Optional: `CHECKION_API_URL` + `CHECKION_ADMIN_API_KEY` (für Dashboard „CHECKION-Nutzer“)

### CHECKION

- [ ] Application mit Dockerfile, Port **3333**
- [ ] `DATABASE_URL` (CHECKION-PostgreSQL, nur App-Daten)
- [ ] `AUTH_SECRET` (≥ 32 Zeichen)
- [ ] `NEXTAUTH_URL` = öffentliche CHECKION-URL
- [ ] `PLEXON_AUTH_URL` = PLEXON-URL (ohne trailing slash)
- [ ] `PLEXON_SERVICE_SECRET` = **gleicher Wert wie bei PLEXON**
- [ ] Optional: `NEXT_PUBLIC_PLEXON_REGISTER_URL` (für Link zur Registrierung)
- [ ] Optional: `CHECKION_ADMIN_API_KEY` (wenn PLEXON CHECKION-User verwalten soll)

---

## 4. AUDION in Coolify (PLEXON-Auth)

AUDION nutzt ein separates Persona-Backend; die **Web-App** kann den Login wie CHECKION über PLEXON validieren.

- **Umgebungsvariablen (AUDION Web-App):** `PLEXON_AUTH_URL` (PLEXON-URL ohne trailing slash), `PLEXON_SERVICE_SECRET` (gleich wie bei PLEXON). Optional: `NEXT_PUBLIC_PLEXON_REGISTER_URL` für den Link „In PLEXON registrieren“ auf der Register-Seite.
- **Ablauf:** Login wird zuerst bei PLEXON validiert; bei Erfolg meldet die Web-App den User mit einem abgeleiteten Passwort beim Persona-Backend an (Login oder einmalig Register). Das Backend bleibt unverändert.
- Doku: AUDION-Repo `knowledge/audion-plexon-auth.md`.

---

## 5. Migration (CHECKION-User → PLEXON) – automatisch im Container-Start

Die User-Migration läuft **automatisch** beim Start des PLEXON-Containers, wenn **`MIGRATION_SOURCE_DATABASE_URL`** in Coolify bei der PLEXON-Application gesetzt ist.

1. In Coolify bei **PLEXON** → Environment Variables eintragen:
   - `MIGRATION_SOURCE_DATABASE_URL` = Connection-URL der **CHECKION**-Datenbank (Quelle).
   - `DATABASE_URL` = PLEXON-DB (Ziel) ist ohnehin gesetzt.
2. Beim nächsten **Deploy/Start** führt der PLEXON-Entrypoint nacheinander aus: Schema-Push (drizzle), dann User-Migration (CHECKION → PLEXON), dann App-Start. Die Migration ist idempotent (mehrfacher Lauf aktualisiert nur).
3. Optional: Nach der ersten erfolgreichen Migration `MIGRATION_SOURCE_DATABASE_URL` in Coolify wieder entfernen, damit beim Start nicht mehr auf die CHECKION-DB zugegriffen wird. Oder dauerhaft lassen – schadet nicht.
4. CHECKION mit `PLEXON_AUTH_URL` + `PLEXON_SERVICE_SECRET` deployen; Login erfolgt über PLEXON.

---

## 6. Troubleshooting

| Problem | Prüfung |
|--------|---------|
| PLEXON 404/503 | Port 3000; `NEXTAUTH_URL` = exakte PLEXON-URL; `/api/health` testen |
| CHECKION Login 401 | `PLEXON_AUTH_URL` und `PLEXON_SERVICE_SECRET` in **beiden** Apps gesetzt und identisch; PLEXON erreichbar von CHECKION-Container aus |
| PLEXON „CHECKION Nutzer“ 503 | `CHECKION_ADMIN_API_KEY` in PLEXON gesetzt; `CHECKION_API_URL` = CHECKION-URL; Key in CHECKION als `CHECKION_ADMIN_API_KEY` gesetzt |
| Session/Redirect kaputt | `NEXTAUTH_URL` in der jeweiligen App = exakt die im Browser aufgerufene URL (inkl. https) |

---

## 7. Zusammenfassung: Was wo in Coolify

| Wo (Coolify) | Was hinterlegen |
|--------------|-----------------|
| **PLEXON → Env** | `AUTH_SECRET`, `DATABASE_URL`, `NEXTAUTH_URL`, `PLEXON_SERVICE_SECRET`; optional `CHECKION_API_URL`, `CHECKION_ADMIN_API_KEY`, `BASE_PATH`, Demo-Variablen |
| **PLEXON → Port** | 3000 |
| **CHECKION → Env** | `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `PLEXON_AUTH_URL`, `PLEXON_SERVICE_SECRET`; optional `NEXT_PUBLIC_PLEXON_REGISTER_URL`, `CHECKION_ADMIN_API_KEY`, OpenAI, Saliency, S3, … |
| **CHECKION → Port** | 3333 |
| **AUDION (Web) → Env** | `PLEXON_AUTH_URL`, `PLEXON_SERVICE_SECRET` (wie CHECKION); optional `NEXT_PUBLIC_PLEXON_REGISTER_URL`. Persona-Backend-URLs wie bisher. |
| **AUDION (Persona-Backend/API) → Env** | `PLEXON_SERVICE_SECRET` (gleich wie PLEXON/Web), damit `POST /auth/plexon-sync` bei 409 funktioniert. |
| **Datenbanken** | Pro App eine PostgreSQL (oder eine gemeinsame); Connection-URL in der jeweiligen App als `DATABASE_URL` |
| **Migration** | Optional: `MIGRATION_SOURCE_DATABASE_URL` bei PLEXON setzen → Migration läuft beim Container-Start automatisch |

---

## 8. Usage-Tracking (Tokens zentral in PLEXON)

CHECKION und AUDION senden Nutzungs-Events (z. B. LLM-Tokens, WCAG-Scans, PageSpeed) an PLEXON. PLEXON rechnet sie in eine Token-Währung um und speichert sie in `usage_events` / `usage_aggregated`. Das Dashboard zeigt die Nutzung pro Dienst und Monat.

- **Keine zusätzlichen Env-Variablen:** Es werden dieselben Werte genutzt wie für Auth:
  - **CHECKION:** `PLEXON_AUTH_URL` + `PLEXON_SERVICE_SECRET` (bereits für Login nötig).
  - **AUDION (Persona-Backend):** `PLEXON_AUTH_URL` + `PLEXON_SERVICE_SECRET` (bereits für Profil-Sync/plexon-sync).
- **PLEXON:** Nach dem ersten Deploy mit `DATABASE_URL` legt PLEXON die Tabellen `usage_events` und `usage_aggregated` an (per `drizzle-kit push`). Die Nutzungs-Sektion erscheint auf dem Dashboard.
