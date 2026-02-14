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
# Pflicht – fehlt einer davon, gibt es 500 bei /api/auth/session und /api/auth/register
AUTH_SECRET=<mind. 32 Zeichen, z. B.: npx auth secret>
DATABASE_URL=postgresql://checkion:<DEIN_PASSWORT>@checkion-postgres:5432/checkion

# Optional – für zuverlässige Session-Cookies hinter Proxy (empfohlen)
AUTH_URL=https://checkion.projects-a.plygrnd.tech
```
Ersetze die URL durch deine echte CHECKION-Domain.

**Hinweis:** Wenn Coolify `postgres://` ausgibt, in `postgresql://` ändern (Drizzle/Node erwarten `postgresql://`).

## 4. Schema anlegen

Beim Start des Containers wird automatisch `drizzle-kit push` ausgeführt. Falls die Tabelle **users** trotzdem fehlt (z. B. Log: `relation "users" does not exist`), Schema einmalig von Hand anlegen:

1. In Coolify: **Application** → CHECKION → **Terminal** (oder **Execute Command**).
2. Befehl ausführen:
   ```bash
   npx drizzle-kit push
   ```
3. Danach die App erneut aufrufen (Login/Registrierung sollte funktionieren).

## 5. Domain & SSL

- Unter **Domains** die gewünschte Domain eintragen (z. B. `checkion.example.com`)
- SSL über Coolify/Let’s Encrypt aktivieren

## 6. Deploy

**Deploy** starten. Beim nächsten Push auf den verbundenen Branch baut Coolify neu (wenn Auto-Deploy aktiv ist).

---

## Bad Gateway (502) beheben

Wenn die Domain **502 Bad Gateway** anzeigt:

1. **Container-Port prüfen**  
   In Coolify: **Application** → **General** / **Settings** → **Port** bzw. **Container Port** muss **3333** sein (nicht 3000 oder 80). Der Proxy leitet dann auf den richtigen Port weiter.

2. **Container-Logs ansehen**  
   In Coolify: **Application** → **Logs** (oder **Deployments** → Container-Logs).  
   - Stürzt der Container sofort ab? Oft fehlen `AUTH_SECRET` oder `DATABASE_URL`, oder die DB ist nicht erreichbar (falscher Host/Passwort).  
   - Steht dort z. B. „Ready on http://0.0.0.0:3333“? Dann läuft die App; dann ist fast immer der **Port in Coolify** falsch (siehe Punkt 1).

3. **Umgebungsvariablen prüfen**  
   - `AUTH_SECRET`: gesetzt und mind. 32 Zeichen?  
   - `DATABASE_URL`: `postgresql://...` (nicht `postgres://`), Host = Name der PostgreSQL-Resource in Coolify (z. B. `checkion-postgres`).

4. **Health-Check (falls konfiguriert)**  
   Wenn Coolify einen Health-Check nutzt: URL z. B. `http://localhost:3333/api/health` (Port 3333).

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
