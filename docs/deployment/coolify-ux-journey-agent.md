# Coolify: UX Journey Agent & CHECKION (Monorepo)

Anleitung: **gleiches GitHub-Repo**, zwei Anwendungen – CHECKION (Next.js) und UX Journey Agent (Python). Der Agent wird als zweiter Service deployt und CHECKION per Env-Variable verbunden.

---

## Teil A: UX Journey Agent (neue Anwendung)

### 1. Neue Anwendung in Coolify

1. **Applications** → **+ Add** (bzw. **New Application**).
2. **Source:** **GitHub** → dasselbe **Repository** und **Branch** wie CHECKION (z. B. `main`).

### 2. Build-Konfiguration

| Wo in Coolify | Wert |
|---------------|------|
| **Build Pack / Build Type** | **Dockerfile** |
| **Build Context / Root Directory / Build Context Path** | `ux-journey-agent` |
| **Dockerfile Path** | `Dockerfile` |

**Wichtig:** Build-Kontext ist `ux-journey-agent` – der Dockerfile liegt darin, also nur **`Dockerfile`** angeben (nicht `ux-journey-agent/Dockerfile`).

### 3. Port

| Wo in Coolify | Wert |
|---------------|------|
| **Port / Container Port** | `8320` |

### 4. Umgebungsvariablen (Agent-Service)

In der neuen Anwendung: **Environment Variables** öffnen und setzen:

| Name | Wert |
|------|------|
| `ANTHROPIC_API_KEY` | Dein Anthropic API Key (für Claude) |

Optional:

| Name | Wert |
|------|------|
| `UX_JOURNEY_MAX_STEPS` | `25` (Standard) |
| `UX_JOURNEY_CLAUDE_MODEL` | `claude-sonnet-4-20250514` |

(Falls du OpenAI nutzt: `OPENAI_API_KEY` statt `ANTHROPIC_API_KEY`.)

### 4a. Persistente Videos (Shared Volume, optional)

Damit Aufnahmen auch nach Container-Neubau noch abspielbar sind:

1. Beim **UX Journey Agent** in Coolify: **Persistent Storage / Volumes** hinzufügen.
2. **Container Path:** z. B. `/data/journey-videos`.
3. **Env:** `UX_JOURNEY_VIDEO_DIR=/data/journey-videos` setzen.

Ohne Volume landen Videos nur in `/tmp` im Container und gehen beim Neustart verloren. Mit Volume bleiben sie erhalten; der Agent liefert sie nach Neustart weiterhin unter `GET /run/{jobId}/video` aus.

### 5. Deploy & interne URL notieren

1. **Name** der Anwendung: z. B. `checkion-ux-journey-agent`.
2. **Deploy** ausführen und warten, bis der Container läuft.
3. **Interne URL** des Agent-Services notieren (z. B. in Coolify unter Network/Container die interne Adresse, z. B. `http://<container-id>:8320` oder wie bei Saliency die **Container-ID** als Hostname).

---

## Teil B: CHECKION mit Agent verbinden

### 6. CHECKION-Anwendung öffnen

Die **bestehende CHECKION-Anwendung** in Coolify öffnen (nicht den Agent).

### 7. Umgebungsvariable setzen

**Environment Variables** → hinzufügen:

| Name | Wert |
|------|------|
| `UX_JOURNEY_AGENT_URL` | `http://<interne-URL-des-Agent-Services>:8320` |

**Hinweis:** Wie beim Saliency-Service: Oft ist die **Container-ID** der Hostname (nicht der App-Name). In Coolify bei der Agent-App die interne Container-URL/ID ermitteln und hier eintragen (ohne trailing slash).

### 8. CHECKION neu deployen

**Redeploy** ausführen, damit `UX_JOURNEY_AGENT_URL` geladen wird.

---

## Kurz-Checkliste

- [ ] **Teil A:** Neue App aus GitHub (gleiches Repo), Build = Dockerfile, Build Context = `ux-journey-agent`, Port = 8320, Env `ANTHROPIC_API_KEY`, deployen, interne URL notieren.
- [ ] **Teil B:** In CHECKION Env `UX_JOURNEY_AGENT_URL=http://<agent-container>:8320` setzen, CHECKION redeployen.

Danach ist der Tab **„UX Journey Agent“** auf der Scan-Seite aktiv: URL + Aufgabe eingeben → Journey starten → Status/Ergebnis unter `/journey-agent/{jobId}`.
