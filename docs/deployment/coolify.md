# CHECKION auf Coolify deployen

Deployment von CHECKION mit **GitHub-Integration** und **Dockerfile** auf Coolify (wie AUDION).

## Voraussetzungen

- Coolify-Instanz erreichbar
- GitHub-Repo mit CHECKION-Code
- Domain (optional; Coolify kann eine bereitstellen)

## 1. PostgreSQL in Coolify anlegen

CHECKION braucht eine PostgreSQL-Datenbank. In Coolify als **Database Resource** anlegen:

1. **Resources** → **Databases** → **PostgreSQL**
2. **Create Resource**
3. Konfiguration:
   - **Name**: z. B. `checkion-postgres`
   - **Version**: 16+
   - **Database Name**: `checkion`
   - **Username**: `checkion`
   - **Password**: starkes Passwort erzeugen und speichern

Notiere die Verbindungsdaten (Host ist der Resource-Name, z. B. `checkion-postgres`, Port `5432`).

## 2. Neue Application in Coolify anlegen

1. **Applications** → **New Application**
2. **GitHub** als Quelle wählen und Repo + Branch verbinden (z. B. `main`)
3. **Build Pack**: **Dockerfile** (nicht Nixpacks)
4. **Dockerfile-Pfad**: `Dockerfile` (im Repo-Root)
5. **Port**: `3333` (wird von CHECKION genutzt)

Optional (Build-Arg): Wenn das Design-System aus einem anderen Repo kommen soll:
`DESIGN_SYSTEM_REPO=https://github.com/<org>/msqdx-design-system.git`

## 3. Umgebungsvariablen setzen

In den Application-Einstellungen unter **Environment Variables** eintragen:

```bash
# Pflicht
AUTH_SECRET=<mind. 32 Zeichen, z. B.: npx auth secret>
DATABASE_URL=postgresql://checkion:<DEIN_PASSWORT>@checkion-postgres:5432/checkion

# Optional – für korrekte Login-Callbacks (sonst nutzt NextAuth die Request-URL)
AUTH_URL=https://deine-domain.de
NEXTAUTH_URL=https://deine-domain.de
```

**Hinweis:** Wenn Coolify `postgres://` ausgibt, in `postgresql://` ändern (Drizzle/Node erwarten `postgresql://`).

## 4. Schema einmalig anlegen

Nach dem ersten Deploy die Tabellen in PostgreSQL anlegen:

1. In Coolify: **Application** → **Service/Container** → **Terminal** (oder **Execute Command**)
2. Im Container ausführen:

```bash
npx drizzle-kit push
```

(Dabei wird die im Container gesetzte `DATABASE_URL` verwendet.)

Alternativ: In Coolify eine **One-off**- oder **Job**-Run mit dem gleichen Image und demselben Befehl ausführen, falls ihr das anbietet.

## 5. Domain & SSL

- Unter **Domains** die gewünschte Domain eintragen (z. B. `checkion.example.com`)
- SSL über Coolify/Let’s Encrypt aktivieren

## 6. Deploy

**Deploy** starten. Beim nächsten Push auf den verbundenen Branch baut Coolify neu (wenn Auto-Deploy aktiv ist).

---

## Lokal mit Docker Compose testen

Im Repo-Root:

```bash
# DB starten, dann Schema pushen, dann App starten
docker compose up -d db
export DATABASE_URL=postgresql://checkion:checkion@localhost:5432/checkion
docker compose run --rm -e DATABASE_URL app npx drizzle-kit push
docker compose up -d app
```

App: http://localhost:3333  
Ersten User unter **Registrieren** anlegen.

---

## Referenzen

- [Coolify Docs](https://coolify.io/docs)
- CHECKION: `knowledge/checkion-auth-and-database.md` (Auth & DB-Übersicht)
