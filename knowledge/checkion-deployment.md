# CHECKION – Deployment (Coolify / Docker)

## Zentrale Pfade & Konventionen

- **App-Port:** `3333` (siehe `package.json` scripts, Dockerfile `PORT`/`EXPOSE`)
- **Health-Check:** `GET /api/health` → `{ "status": "ok" }`
- **Dockerfile:** Repo-Root `Dockerfile` (multi-stage, baut Design-System aus GitHub)
- **Design-System im Build:** Wird aus GitHub geklont (Default: `https://github.com/chbrdk/msqdx-design-system.git`), Build-Arg `DESIGN_SYSTEM_REPO` zum Überschreiben

## Umgebungsvariablen (Referenz)

| Variable       | Pflicht | Beschreibung |
|----------------|--------|--------------|
| `AUTH_SECRET`  | ja     | NextAuth Secret (z. B. `npx auth secret`) |
| `DATABASE_URL` | ja     | `postgresql://user:pass@host:5432/dbname` (Coolify: Host = DB-Resource-Name) |
| `AUTH_URL`     | nein   | Öffentliche App-URL für Callbacks (z. B. `https://checkion.example.com`) |
| `NEXTAUTH_URL` | nein   | Wie `AUTH_URL`, falls NextAuth sie auswertet |
| `DS_BASE`      | nein   | Nur im Build/Dev; im Docker-Build gesetzt: `../msqdx-design-system` |

## Nach dem ersten Deploy

Tabellen anlegen: im Container oder als One-off-Job `npx drizzle-kit push` ausführen (siehe `docs/deployment/coolify.md`).

## Weitere Docs

- **Coolify-Schritt-für-Schritt:** `docs/deployment/coolify.md`
- **Auth & DB-Schema:** `knowledge/checkion-auth-and-database.md`
