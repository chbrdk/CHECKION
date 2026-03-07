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

## Schema beim Start

Der Container führt beim Start automatisch `npx drizzle-kit push` aus (siehe `scripts/docker-entrypoint.sh`). Tabellen werden angelegt/aktualisiert, sobald `DATABASE_URL` gesetzt ist – kein manueller Schritt nötig.

## Docker-Build-Fehler (z. B. „exit code 1“ bei `npm run build`)

Der Docker-Build klont das **Design-System** aus GitHub (`DESIGN_SYSTEM_REPO`) und baut es. Danach baut Next.js die CHECKION-App; dabei wird `@msqdx/react` aus dem geklonten Design-System verwendet.

- **Typischer Fehler:** Build bricht mit „Next.js build worker exited with code 1“ ab, oft mit Zeilenangabe (z. B. 114–116) ohne klare Meldung.
- **Häufige Ursache:** Das geklonte Repo **msqdx-design-system** (z. B. `https://github.com/chbrdk/msqdx-design-system`) ist **nicht aktuell**. Enthält es nicht die gleichen Änderungen wie dein lokales Design-System (z. B. `PrismionKind 'tool'`, ToolCard, PrismionPorts CHECKION-Option), kann der Next-Build mit TypeScript-/Kompilierfehlern scheitern.
- **Lösung:** Aktuelle Änderungen im Design-System nach GitHub pushen, danach den CHECKION-Docker-Build erneut ausführen. Optional: Build-Arg `DESIGN_SYSTEM_REPO` auf einen anderen Branch oder Fork setzen, der aktuell ist.

## Weitere Docs

- **Coolify-Schritt-für-Schritt:** `docs/deployment/coolify.md`
- **Auth & DB-Schema:** `knowledge/checkion-auth-and-database.md`
