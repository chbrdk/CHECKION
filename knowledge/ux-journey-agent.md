# UX Journey Agent (Browser Agent)

## Übersicht

Der **UX Journey Agent** ist eine dritte Scan-Möglichkeit neben **Single Page Scan** und **Deep Domain Scan**. Ein Browser-Agent navigiert autonom durch eine Website und führt eine in natürlicher Sprache beschriebene Aufgabe aus (z. B. „Finde Produkt X und lege es in den Warenkorb“).

## Unterschied zu bestehendem Journey (Domain-Journey)

| | **Bestehender Journey** (`/api/scan/domain/[id]/journey`) | **UX Journey Agent** (neu) |
|---|---|---|
| Voraussetzung | Abgeschlossener Deep Scan (Domain) | Keine – nur URL + Aufgabe |
| Steuerung | LLM wählt aus bereits gecrawlten Seiten/Links (kein echter Browser) | Echter Browser (Playwright), Agent klickt/tippt/scrollt |
| Framework | `lib/llm/journey-agent.ts` (OpenAI, DomainScanResult) | Browser Use (Python) + Claude + pgvector |
| Speicher | Gespeicherte Journeys in CHECKION DB (nach Durchlauf) | pgvector (episodisches Gedächtnis für ähnliche Aufgaben) |

## Architektur (Ziel)

```
User (URL + Aufgabe) → CHECKION UI → POST /api/scan/journey-agent
        → Optional: Python-Service (Browser Use + Claude + pgvector)
        → Antwort: jobId → Status/Result abrufbar
```

- **Browser Use** (Python, Playwright): Browsersteuerung, DOM-Extraktion, Screenshots.
- **Claude API** (Vision + Reasoning): Entscheidet nächste Aktion (click, type, scroll, navigate).
- **PostgreSQL + pgvector**: Speichert erfolgreiche Journeys als Embeddings; bei ähnlichen Aufgaben wird vergangene Pfade abgerufen.

## Datenmodell (Python/pgvector)

```sql
CREATE TABLE journey_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_description TEXT,
    site_domain TEXT,
    steps JSONB,
    success BOOLEAN,
    embedding VECTOR(1536),
    screenshots TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);
```

Ein Schritt (in `steps`):

```json
{
  "step": 3,
  "action": "click",
  "target": "Navigation link 'Products'",
  "selector": "nav a[href='/products']",
  "reasoning": "The products section is most likely to contain the search target",
  "screenshot": "step_003.png",
  "timestamp": "2026-02-18T14:22:01Z"
}
```

## API-Vertrag (CHECKION ↔ Python-Service)

- **Env:** `UX_JOURNEY_AGENT_URL` = Basis-URL des Python-Services (z. B. `http://localhost:8320`).
- **Start:** `POST {UX_JOURNEY_AGENT_URL}/run` Body: `{ "url": "https://example.com", "task": "Find product X and add to cart" }` → Antwort: `{ "jobId": "uuid" }`.
- **Status/Ergebnis:** `GET {UX_JOURNEY_AGENT_URL}/run/{jobId}` → `{ "status": "running"|"complete"|"error", "result?: { steps, success, ... }" }`.
- Max Steps z. B. 25 (im Service konfigurierbar).

## Deployment auf Coolify

Das gesamte Setup läuft auf **Coolify**. CHECKION (Next.js) und der UX Journey Agent (Python) sind typischerweise **zwei getrennte Services** im gleichen Coolify-Projekt.

### CHECKION (Web-App)

- Wie bisher deployen (Next.js). Damit der UX-Journey-Tab den Agent nutzt, muss die **Umgebungsvariable** gesetzt werden:
  - **`UX_JOURNEY_AGENT_URL`** = URL des Agent-Services.
  - **Intern (empfohlen):** Wenn der Agent als weiterer Service im gleichen Coolify-Projekt/Stack läuft, interne URL verwenden, z. B. `http://<service-name>:8320` (Coolify/Docker vergibt den Hostnamen nach Service-Namen). So bleibt der Traffic im Netzwerk und es braucht keine öffentliche Exposition des Agent-Ports.
  - **Öffentlich:** Falls der Agent einen eigenen öffentlichen Host hat, z. B. `https://ux-journey-agent.deine-domain.de`.

### UX Journey Agent (Python-Service)

- Als eigener Coolify-Service deployen (Dockerfile, z. B. Python 3.12 + Playwright/Browser Use).
- Port des HTTP-Servers (z. B. 8320) in Coolify exponieren oder nur intern belassen und nur `UX_JOURNEY_AGENT_URL` von CHECKION aus auf den internen Hostnamen zeigen.
- PostgreSQL + pgvector: als separater Coolify-Service (DB) oder bestehende DB; der Agent braucht eine eigene DB-URL (z. B. `DATABASE_URL` / `POSTGRES_URL`) in seinen Coolify-Env-Variablen.
- Claude/Anthropic API Key etc. als Env im Agent-Service setzen.

### Kurz-Checkliste Coolify

1. **CHECKION:** Env `UX_JOURNEY_AGENT_URL` = interne oder öffentliche URL des Agent-Services (ohne trailing slash).
2. **Agent-Service:** Eigenes Deployment, Port (z. B. 8320), DB- und API-Keys in Coolify konfigurieren.
3. Beide Services im gleichen Projekt → interne URL nutzen, damit keine unnötige öffentliche Oberfläche für den Agent nötig ist.

## CHECKION-Integration

- **Scan-Seite:** Dritter Tab „UX Journey“ – Felder: URL, Aufgabe (Text). Submit → `POST /api/scan/journey-agent` mit `{ url, task }`.
- **API** `POST /api/scan/journey-agent`: Prüft Auth, validiert url + task; wenn `UX_JOURNEY_AGENT_URL` gesetzt: Request an Service weiterleiten und jobId zurückgeben; sonst 501 (Service nicht verbunden).
- **Ergebnis:** Optional eigene Seite `/journey-agent/[jobId]` mit Polling; oder Link zum Python-Service-Dashboard.

## Prioritäten (Entwicklung)

1. Agent-Loop mit Browser Use + Claude end-to-end (Python).
2. Journey-Logging (Schritte + Screenshots).
3. pgvector-Integration (speichern → abrufen → Kontext nutzen).
4. CLI für Journeys (Python).
5. Reporting (Markdown/HTML) und Anbindung CHECKION-UI.

## Constraints

- Browser Use als Framework nutzen, keine eigene Browsersteuerung.
- Einfaches Memory: pgvector-Similarity auf Task-Embeddings.
- Jeder Schritt erzeugt einen Screenshot (Audit).
- Max-Step-Limit (Default 25) gegen Endlosschleifen.

---

## Was noch gemacht werden muss (Entwicklung vs. dein Part)

Alles wird aus der **GitHub-Repo** heraus auf **Coolify** deployed. Hier die klare Aufteilung.

### Noch zu entwickeln (Code – nicht fertig)

| Was | Status | Wo |
|-----|--------|-----|
| **CHECKION (Next.js)** – UX-Journey-Tab, API, Status-Seite | ✅ Erledigt | Diese Repo (CHECKION), bereits drin |
| **Python-Service „UX Journey Agent“** | ✅ Im Monorepo | Ordner **`ux-journey-agent/`** (gleiches Repo wie CHECKION) |

Der **Python-Agent** liegt im Monorepo:

- **Pfad:** `ux-journey-agent/` (Dockerfile, main.py, requirements.txt).
- **Tech:** Python 3.12+, browser-use, Playwright, Claude (ANTHROPIC_API_KEY) oder OpenAI.
- **API:** `POST /run` → `{ "jobId" }`; `GET /run/{jobId}` → Status + Result.
- **Coolify:** Build Context = `ux-journey-agent`, Port 8320. Siehe **`docs/deployment/coolify-ux-journey-agent.md`**.

Ohne Deployment des Agent-Services und ohne `UX_JOURNEY_AGENT_URL` in CHECKION zeigt die App beim Klick auf „Journey starten“ die Meldung *„UX Journey Agent Service ist nicht konfiguriert“* (501).

---

### Dein Part: Deployment von GitHub auf Coolify

**1) CHECKION (wie bisher)**

- Repo: **CHECKION** (diese GitHub-Repo).
- In Coolify: Weiter wie bisher deployen (z. B. „Deploy from GitHub“ → Repo auswählen, Build/Start).
- **Optional sofort:** In Coolify bei der CHECKION-App unter **Environment Variables** eine Variable anlegen (kann erstmal leer bleiben oder weggelassen werden):
  - **Name:** `UX_JOURNEY_AGENT_URL`  
  - **Wert:** (leer lassen, bis der Agent-Service läuft; danach siehe Schritt 3)
- Ohne diese Variable: UX-Journey-Tab funktioniert, startet aber keine Journey (501-Hinweis). Rest der App unverändert.

**2) UX Journey Agent (Monorepo: gleiches Repo, Build Context `ux-journey-agent`)**

- Repo: **Dasselbe GitHub-Repo** wie CHECKION.
- In Coolify: **Neuen Service** anlegen → „Deploy from GitHub“ → gleiches Repo/Branch.
- **Build:** Build Context = **`ux-journey-agent`**, Dockerfile = `Dockerfile`, Port **8320**.
- **Env-Variablen** im Agent-Service: **`ANTHROPIC_API_KEY`** (oder `OPENAI_API_KEY`) für Claude/OpenAI.
- Detailliert: **`docs/deployment/coolify-ux-journey-agent.md`**.
- **Netzwerk:** Service nur intern halten; CHECKION greift per `UX_JOURNEY_AGENT_URL` zu.

**3) CHECKION mit Agent verbinden**

- In Coolify bei der **CHECKION**-App: Env-Variable **`UX_JOURNEY_AGENT_URL`** setzen.
- **Wert (empfohlen):** Interne URL des Agent-Services, z. B.  
  `http://<coolify-service-name-des-agents>:8320`  
  (Service-Name = der Name, unter dem du den Agent-Service in Coolify angelegt hast; keine trailing slash).
- Nach Redeploy von CHECKION nutzt der UX-Journey-Tab den Agent.

**4) Optional: PostgreSQL + pgvector für den Agent**

- Falls der Agent eine eigene DB braucht: In Coolify eine PostgreSQL-Datenbank anlegen (mit pgvector-Extension), Connection-URL in den Agent-Service als `DATABASE_URL` (oder wie im Code) eintragen.

---

### Kurz: Was du konkret machst

| Schritt | Was du machst |
|--------|----------------|
| Jetzt | CHECKION wie gewohnt aus GitHub auf Coolify deployen. `UX_JOURNEY_AGENT_URL` kannst du weglassen oder leer lassen. |
| Agent deployen | Neuen Coolify-Service aus dem **gleichen** GitHub-Repo deployen: Build Context **`ux-journey-agent`**, Port 8320, Env **`ANTHROPIC_API_KEY`**. Siehe `docs/deployment/coolify-ux-journey-agent.md`. |
| Danach | Bei CHECKION in Coolify `UX_JOURNEY_AGENT_URL` = `http://<agent-service-name>:8320` setzen und CHECKION neu deployen. |
