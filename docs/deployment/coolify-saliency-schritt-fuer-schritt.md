# Coolify: Saliency-Service & CHECKION – Schritt für Schritt

Eine Anleitung: **wo du in Coolify was eintragen musst.** (Gleiches GitHub-Repo, zwei Anwendungen.)

---

## Teil A: Saliency-Service (neue Anwendung anlegen)

### Schritt 1: Neue Anwendung

1. In Coolify: **Applications** → **+ Add** (bzw. **New Application**).
2. **Source** / **Quelle:** **GitHub** auswählen.
3. Dasselbe **Repository** und **Branch** wählen wie bei CHECKION (z. B. `main`).

### Schritt 2: Build-Konfiguration

1. **Build Pack** auf **Dockerfile** stellen (nicht Nixpacks).
2. In der gleichen Maske bzw. unter **„Build Pack konfigurieren“** / **„Configure the Build Pack“** findest du:
   - **Base Directory** (in neueren Coolify-Versionen der Name für den Build-Kontext):  
     Trage **`saliency-service`** ein (oder **`/saliency-service`**, falls ein führender Slash verlangt wird).  
     Damit ist das Projekt-Root für den Docker-Build der Ordner `saliency-service` – alle `COPY`-Befehle im Dockerfile beziehen sich darauf.
   - Falls es **kein** Feld „Base Directory“ gibt: Suche in derselben Sektion oder unter **Erweitert / Advanced** nach **Root Directory**, **Build Context**, **Context Path** oder **Base Directory** und setze den Wert auf **`saliency-service`**.
3. **Dockerfile Path** (falls vorhanden): **`Dockerfile`** (relativ zum Base Directory, also die Datei `saliency-service/Dockerfile`). Manche Versionen brauchen hier nur **`Dockerfile`**, andere **`Dockerfile`** unter dem gewählten Base Directory.

| In Coolify (Bezeichnung je Version) | Wert |
|-------------------------------------|------|
| **Build Pack** | **Dockerfile** |
| **Base Directory** / Root Directory / Build Context | **`saliency-service`** (oder `/saliency-service`) |
| **Dockerfile Path** (falls abgefragt) | **`Dockerfile`** |

**Wichtig:** Ohne Base Directory = `saliency-service` baut Coolify aus dem Repo-Root; dann finden die `COPY`-Befehle im Dockerfile die Dateien nicht.

**„Base Directory“ / Build-Kontext finde ich nirgends:**  
Laut [Coolify-Doku](https://coolify.io/docs/builds/packs/dockerfile) erscheint **Base Directory** beim **„Configure the Build Pack“** (Schritt 5), direkt nach der Auswahl „Dockerfile“. Es kann sein, dass deine Oberfläche anders heißt (z. B. **Root**, **Context**, **Build Context**) oder erst nach Klick auf **Erweitert / Advanced** sichtbar ist. Bei manchen Setups steht es in der **Build**-Sektion der Anwendung unter den Dockerfile-Optionen. Wenn es wirklich fehlt: Coolify-Version prüfen (ggf. aktualisieren) oder in der Anwendung unter **Build** / **Advanced** alle ausgeklappten Bereiche durchsehen.

### Schritt 3: Port

| Wo in Coolify | Was eintragen |
|---------------|----------------|
| **Port** / **Container Port** / **Exposed Port** | `8000` |

### Schritt 4: Umgebungsvariable (Weights)

1. In der neuen Anwendung: **Environment Variables** / **Variables** / **Env** öffnen.
2. Variable hinzufügen:

| Name | Wert |
|------|------|
| `WEIGHTS_FOLDER_ID` | `10tZL7oNfaRkBHHTeqjog0ZIJacrr2Ya0` |

(Das ist die Google-Drive-Ordner-ID von MDS-ViTNet. Beim ersten Start lädt der Container die Modell-Weights von dort.)

### Schritt 5: Namen & Deploy

1. **Name** der Anwendung: z. B. `checkion-saliency`.
2. **Deploy** ausführen.
3. Warten, bis der Build durch ist und der Container läuft.
4. **Interne Container-Adresse für Teil B ermitteln** (wichtig für „fetch failed“):
   - Saliency-Anwendung in Coolify öffnen.
   - Nach **interner URL** / **Container-Name** suchen: oft ein **Auge-Symbol (👁)** oder Link neben der Domain/Network-Sektion. Dort steht die **Container-ID** (z. B. `rc8gsg4kcwc8k0wsgo484w80` oder ein kürzerer Name).
   - Diese ID ist der Hostname, den CHECKION braucht: **`http://<diese-id>:8000`**

---

## Teil B: CHECKION – Saliency-URL eintragen

### Schritt 6: CHECKION-Anwendung öffnen

1. In Coolify die **bestehende CHECKION-Anwendung** öffnen (nicht die neue Saliency-App).

### Schritt 7: Umgebungsvariable setzen

1. **Environment Variables** / **Variables** / **Env** öffnen.
2. Neue Variable hinzufügen:

| Name | Wert |
|------|------|
| `SALIENCY_SERVICE_URL` | `http://<Container-ID>:8000` **oder** `https://sum-saliency.deine-domain.tech` |

**Alternative: KI-Heatmap (ohne SUM-Container)**  
Statt des SUM-Services kannst du eine **KI-basierte Heatmap** nutzen (OpenAI Vision erkennt Aufmerksamkeits-Regionen, Headlines/CTAs/Bilder werden als Hotspots gerendert):

| Name | Wert |
|------|------|
| `SALIENCY_USE_AI` | `true` oder `1` |
| `OPENAI_API_KEY` | dein OpenAI API-Key (bereits für Zusammenfassungen genutzt) |

Optional: `OPENAI_SALIENCY_MODEL` (Standard: `gpt-4o-mini`) für das Vision-Modell. Wenn `SALIENCY_USE_AI` gesetzt ist, wird **kein** SUM-Container benötigt; die Heatmap wird direkt in CHECKION berechnet (ca. 10–30 s pro Screenshot).

**Option 1 – Intern:** Container-ID aus Schritt 5.4 (z. B. `http://rc8gsg4kcwc8k0wsgo484w80:8000`). **Nur `http://`** – der Container hat keinen TLS-Server; bei HTTPS auf interner ID entsteht „SSL packet length too long“.  
**Option 2 – Öffentliche Domain:** Wenn die Saliency-App eine eigene Domain hat (z. B. `https://sum-saliency.projects-a.plygrnd.tech`), diese **mit `https://`** eintragen. CHECKION lässt HTTPS bei Domains unverändert.

### Schritt 8: CHECKION neu deployen

1. **Redeploy** / **Deploy** ausführen, damit die neue Variable geladen wird.

---

## Kurz-Checkliste

- [ ] **Teil A:** Neue App mit GitHub (gleiches Repo), Build Pack = Dockerfile, **Base Directory** = `saliency-service`, Dockerfile Path = `Dockerfile`, Port = `8000`, Env `WEIGHTS_FOLDER_ID=10tZL7oNfaRkBHHTeqjog0ZIJacrr2Ya0`, deployen, interne URL notieren.
- [ ] **Teil B:** In CHECKION Env `SALIENCY_SERVICE_URL=http://<saliency-app-name>:8000` eintragen, CHECKION redeployen.

Danach werden bei jedem neuen Scan die Attention-Heatmaps asynchron berechnet und auf der Ergebnis-Seite angezeigt, sobald sie fertig sind.

---

---

## Auf SUM umstellen (genaue Coolify-Anleitung)

SUM ist das Modell **speziell für Webseiten/UI** (Headlines, CTAs wie bei EyeQuant). So stellst du in Coolify genau um.

### SUM-Weights: nur in Coolify (kein Terminal nötig)

Der Container kann die Weights **beim ersten Start selbst von Google Drive laden**. Du musst nur eine Umgebungsvariable in Coolify setzen:

| In Coolify | Wert |
|------------|------|
| **Environment Variables** der Saliency-App (SUM) | **Name:** `SUM_WEIGHTS_GDRIVE_ID` |
| | **Wert:** `14ma_hLe8DrVNuHCSKoOz41Q-rB1Hbg6A` |

Das ist die Google-Drive-**Datei-ID** von `sum_model.pth`. Beim ersten Deploy lädt der Container die Datei automatisch herunter. **Optional:** Ein Volume unter **Storages** mit Zielpfad `/app/SUM/net/pre_trained_weights` anlegen – dann bleibt die Datei nach einem Redeploy erhalten und wird nicht erneut geladen.

---

### Variante 1: Bestehende Saliency-App auf SUM umbauen

Falls du schon eine Saliency-Anwendung (MDS-ViTNet) hast und sie komplett durch SUM ersetzen willst:

| Wo in Coolify | Aktion |
|---------------|--------|
| **Saliency-Anwendung** öffnen | Deine bestehende Saliency-App anklicken. |
| **Build** / **Build Configuration** | **Dockerfile Path** von `Dockerfile` auf **`Dockerfile.sum`** ändern. **Base Directory** (bzw. Build Context) bleibt **`saliency-service`**. |
| **Environment Variables** | Variable **`WEIGHTS_FOLDER_ID`** **entfernen** (wird von SUM nicht genutzt). |
| **Weights für SUM** | Siehe unten: entweder **Storages/Volumes** ODER **`SUM_WEIGHTS_URL`** setzen. |
| **Speichern** | Änderungen speichern. |
| **Redeploy** | Einen neuen **Deploy** starten (Rebuild mit Dockerfile.sum). |

**Weights für SUM (nur in Coolify):**

1. **Environment Variables** der Saliency-App öffnen.  
2. Variable hinzufügen: **Name** = **`SUM_WEIGHTS_GDRIVE_ID`**, **Wert** = **`14ma_hLe8DrVNuHCSKoOz41Q-rB1Hbg6A`**.  
3. **Deploy** starten. Beim ersten Start lädt der Container die Datei automatisch von Google Drive – kein Terminal, kein manuelles Kopieren.

**Optional (damit die Datei nach Redeploys erhalten bleibt):** Unter **Storages** ein Volume anlegen mit **Destination Path** (im Container) **`/app/SUM/net/pre_trained_weights`**. Dann wird die heruntergeladene Datei im Volume gespeichert und bleibt beim nächsten Deploy erhalten.

**CHECKION:**  
- In der **CHECKION**-App unter **Environment Variables** **`SALIENCY_SERVICE_URL`** unverändert lassen (weiter **`http://<Container-ID>:8000`** mit der **gleichen** Saliency-Container-ID).  
- Einmal **Redeploy** von CHECKION, damit die Verbindung wieder genutzt wird.  
- Ab dann nutzt CHECKION automatisch SUM (gleiche URL, anderer Service-Inhalt).

---

### Variante 2: Neue separate SUM-Anwendung anlegen

Falls du MDS-ViTNet weiterlaufen lassen willst und **zusätzlich** SUM testen willst (oder nur SUM nutzen willst, aber sauber neu):

| Schritt | Wo in Coolify | Was eintragen / tun |
|--------|----------------|----------------------|
| 1 | **Applications** → **+ Add** | Neue Anwendung anlegen. |
| 2 | **Source** | **GitHub**, gleiches **Repository** und **Branch** wie CHECKION (z. B. `main`). |
| 3 | **Build** / **Build Pack** | **Dockerfile**. |
| 4 | **Base Directory** (oder Root Directory / Build Context) | **`saliency-service`** – falls du das Feld nicht siehst, siehe Hinweis oben unter „Schritt 2“. |
| 5 | **Dockerfile Path** (falls vorhanden) | **`Dockerfile.sum`** (nicht `Dockerfile`). |
| 6 | **Port** | **`8000`** |
| 7 | **Name** | z. B. **`checkion-saliency-sum`** |
| 8 | **Environment Variables** | **`SUM_WEIGHTS_GDRIVE_ID`** = **`14ma_hLe8DrVNuHCSKoOz41Q-rB1Hbg6A`** eintragen. Beim ersten Start lädt der Container die Weights von Google Drive – alles nur in Coolify, kein Terminal. Optional: Volume unter Storages mit Destination **`/app/SUM/net/pre_trained_weights`**, damit die Datei nach Redeploys erhalten bleibt. |
| 9 | **Deploy** | Ersten Deploy starten, bis Build durch und Container läuft. |
| 10 | **Interne URL notieren** | In der neuen SUM-App: **Netzwerk** / **Internal URL** / Container-ID (👁) ablesen, z. B. `abc123xyz`. |
| 11 | **CHECKION** öffnen | Deine CHECKION-Anwendung. |
| 12 | **Environment Variables** | **`SALIENCY_SERVICE_URL`** = **`http://<Container-ID>:8000`** (intern) oder **`https://sum-saliency.deine-domain.tech`** (öffentliche Domain der SUM-App). |
| 13 | **CHECKION Redeploy** | CHECKION neu deployen. |

Ab dann generieren neue Scans die Heatmap mit **SUM** (UI/Webseiten-Modell).

---

### Prüfen, ob SUM läuft

- In der Saliency-App: **Logs** öffnen – beim Start sollte **kein** MDS-ViTNet-/Google-Drive-Download mehr vorkommen, dafür ggf. SUM-/PyTorch-Meldungen.
- Optional: **Health** aufrufen (wenn du eine Domain für den Saliency-Service hast):  
  `https://deine-saliency-domain/health`  
  Antwort sollte z. B. enthalten: **`"model": "SUM"`**, **`"condition": "UI (web pages)"`**.

---

## SUM-Weights per Terminal in den Volume legen (Fallback)

Nur nötig, wenn der **automatische Download** über **`SUM_WEIGHTS_GDRIVE_ID`** in Coolify nicht funktioniert (z. B. Netzwerk oder Google-Rate-Limit). Ansonsten reicht die Env-Variable in Coolify. Wenn du **nur per Terminal** (SSH oder Coolify-Shell) auf den Server kannst: So kommt **sum_model.pth** in den richtigen Ordner.

### Schritt 1: Datei auf den Server bekommen

**Variante A – Du lädst auf deinem Rechner runter, dann hoch:**

1. Auf deinem PC: [Google Drive – sum_model.pth](https://drive.google.com/file/d/14ma_hLe8DrVNuHCSKoOz41Q-rB1Hbg6A/view) öffnen und **Herunterladen** (die Datei heißt `sum_model.pth`).
2. Per SCP auf den Coolify-Server kopieren (in einem Terminal auf deinem PC, ersetze `user` und `dein-server.de`):

   ```bash
   scp ~/Downloads/sum_model.pth user@dein-server.de:/tmp/sum_model.pth
   ```

**Variante B – Direkt auf dem Server runterladen (wenn Python + gdown da sind):**

```bash
# Auf dem Coolify-Server (SSH oder Coolify-Terminal)
pip install --user gdown   # oder: sudo pip install gdown
gdown "https://drive.google.com/uc?id=14ma_hLe8DrVNuHCSKoOz41Q-rB1Hbg6A" -O /tmp/sum_model.pth
```

Falls `gdown` nicht geht: Datei wie in Variante A auf dem PC runterladen und mit `scp` nach `/tmp/sum_model.pth` auf den Server kopieren.

---

### Schritt 2: Saliency-Container finden

Auf dem Server:

```bash
docker ps
```

In der Liste den **Container** deiner Saliency-App finden (Name enthält oft „saliency“ oder den Coolify-App-Namen). Die **CONTAINER ID** (z. B. `a1b2c3d4e5f6`) oder den **NAMES**-Namen notieren.

---

### Schritt 3: Host-Pfad des Volumes rausfinden

Der Container hat das Volume unter `/app/SUM/net/pre_trained_weights` gemountet. Auf dem **Host** liegt es woanders. So siehst du den Pfad (ersetze `CONTAINER_ID` durch die ID aus Schritt 2):

```bash
docker inspect CONTAINER_ID --format '{{range .Mounts}}{{if eq .Destination "/app/SUM/net/pre_trained_weights"}}{{.Source}}{{end}}{{end}}'
```

Ausgabe ist ein Pfad, z. B. `/var/lib/docker/volumes/xyz/_data` oder `/data/coolify/volumes/...`. Das ist **VOLUME_PFAD** für den nächsten Schritt.

Falls die Ausgabe leer ist, alle Mounts anzeigen:

```bash
docker inspect CONTAINER_ID --format '{{json .Mounts}}' | python3 -m json.tool
```

Dann den Eintrag suchen, bei dem `"Destination": "/app/SUM/net/pre_trained_weights"` ist; **Source** ist der Host-Pfad.

---

### Schritt 4: Datei in den Volume-Ordner kopieren

Ersetze **VOLUME_PFAD** durch den Pfad aus Schritt 3:

```bash
sudo cp /tmp/sum_model.pth VOLUME_PFAD/sum_model.pth
```

Beispiel:

```bash
sudo cp /tmp/sum_model.pth /var/lib/docker/volumes/coolify_xyz_pre_trained_weights/_data/sum_model.pth
```

Prüfen:

```bash
sudo ls -la VOLUME_PFAD/
```

Dort sollte `sum_model.pth` stehen.

---

### Schritt 5: Container neu starten

Damit die Saliency-App die Datei lädt:

```bash
docker restart CONTAINER_ID
```

Oder in Coolify: **Saliency-App** → **Restart**.

---

### Kurz-Checkliste (Terminal)

1. `sum_model.pth` liegt auf dem Server unter `/tmp/sum_model.pth`.
2. Container-ID der Saliency-App: `docker ps`.
3. Host-Pfad des Volumes: `docker inspect CONTAINER_ID --format '...'` (siehe oben).
4. `sudo cp /tmp/sum_model.pth VOLUME_PFAD/sum_model.pth`
5. `docker restart CONTAINER_ID`

Danach sollte der SUM-Service starten und die Heatmap nutzen.

---

## Optional: SUM vs. MDS-ViTNet (Kurzüberblick)

| | MDS-ViTNet (Standard) | SUM (Webseiten/UI) |
|--|------------------------|---------------------|
| **Dockerfile** | `Dockerfile` | `Dockerfile.sum` |
| **Weights** | `WEIGHTS_FOLDER_ID` (Google Drive) oder Volume mit `ViT_*.pth` + `CNNMerge.pth` | Volume mit `sum_model.pth` oder `SUM_WEIGHTS_URL` |
| **Modell** | Allgemeine Szenen | Speziell Webseiten, UI, Headlines, CTAs (EyeQuant-nah) |

---

## Build-Fehler SUM (causal-conv1d / NumPy)

Falls der Build von **Dockerfile.sum** mit Fehlern wie **„numpy 2.x“** oder **„bare_metal_version not defined“** abbricht: Das Image ist für **CPU-only** (ohne CUDA/nvcc) ausgelegt. Im Repo ist das bereits behoben:

- **PyTorch** wird als CPU-Variante installiert (kleineres Image).
- **NumPy** wird auf &lt;2 gepinnt (causal-conv1d 1.0.2 verträgt kein NumPy 2).
- **causal-conv1d** wird ohne CUDA gebaut (`CAUSAL_CONV1D_SKIP_CUDA_BUILD=TRUE`), damit auf dem Build-Server kein nvcc nötig ist.

Nach einem **git pull** und erneutem **Deploy** sollte der Build durchlaufen. Wenn du Änderungen am Dockerfile.sum lokal gemacht hast, diese mit der Repo-Version abgleichen.

---

## Fehler: 502 bei POST /api/saliency/generate

Seit der **async-Umstellung** (Job-API) antwortet `POST /api/saliency/generate` sofort mit `{ jobId }`; die Berechnung läuft im Saliency-Service im Hintergrund. Die App pollt `GET /api/saliency/result?jobId=…&scanId=…` alle paar Sekunden. Dadurch sind **lange offene Requests** und damit **502 durch Proxy-Timeout** deutlich seltener. Falls du dennoch 502 siehst:

**502 Bad Gateway** beim Klick auf „Heatmap jetzt berechnen“ kann weiterhin vom **Proxy-Timeout** kommen (z. B. wenn der erste Request doch zu lange blockiert).

### Ursache: Proxy bricht nach 60 Sekunden ab

Die Saliency-Berechnung (SUM auf CPU) dauert **1–3 Minuten**. Der Coolify-Proxy (meist **Traefik**) hat standardmäßig nur **60 Sekunden** Lese-Timeout. Nach 60 s schließt der Proxy die Verbindung → der Browser bekommt **502**, obwohl CHECKION und der Saliency-Service noch arbeiten.

### Lösung: Timeout am Proxy erhöhen

1. In Coolify: **Server** auswählen (z. B. „projects-01“) → **Proxy** (oder **Proxy / Configuration**).
2. Prüfen, welcher Proxy läuft (Traefik, Caddy, …). Bei **Traefik**:
3. In der Proxy-Konfiguration die **Command**- bzw. **Argumente**-Sektion finden und die Timeouts für den HTTPS-Entrypoint setzen. Beispiel (5 Minuten):
   ```yaml
   command:
     - '--entrypoints.https.transport.respondingTimeouts.readTimeout=5m'
     - '--entrypoints.https.transport.respondingTimeouts.writeTimeout=5m'
     - '--entrypoints.https.transport.respondingTimeouts.idleTimeout=5m'
   ```
   Falls dort schon andere `command`-Einträge stehen: diese drei Zeilen **ergänzen** (nicht ersetzen).  
   Quelle: [Coolify Gateway Timeout](https://coolify.io/docs/troubleshoot/applications/gateway-timeout).
4. Proxy **speichern** und ggf. **neu starten** (Coolify übernimmt das oft beim Speichern).
5. Erneut **„Heatmap jetzt berechnen“** testen – die Anfrage darf jetzt bis zu 5 Minuten offen bleiben.

### Wenn 502 danach noch auftritt

- **SALIENCY_SERVICE_URL** in der CHECKION-App prüfen: z. B. `https://sum-saliency.projects-a.plygrnd.tech` (ohne Slash am Ende).
- **Saliency-Logs** prüfen: Beim Klick auf „Heatmap jetzt berechnen“ sollte im SUM-Container **POST /predict** ankommen. Kommt nichts an → CHECKION erreicht den Service nicht (URL oder Netzwerk).
- Bei interner URL: **Container-ID** der Saliency-App in Coolify notieren und `SALIENCY_SERVICE_URL=http://<Container-ID>:8000` setzen, CHECKION redeployen.
