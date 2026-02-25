# Coolify: Saliency-Service & CHECKION – Schritt für Schritt

Eine Anleitung: **wo du in Coolify was eintragen musst.** (Gleiches GitHub-Repo, zwei Anwendungen.)

---

## Teil A: Saliency-Service (neue Anwendung anlegen)

### Schritt 1: Neue Anwendung

1. In Coolify: **Applications** → **+ Add** (bzw. **New Application**).
2. **Source** / **Quelle:** **GitHub** auswählen.
3. Dasselbe **Repository** und **Branch** wählen wie bei CHECKION (z. B. `main`).

### Schritt 2: Build-Konfiguration

| Wo in Coolify | Was eintragen |
|---------------|----------------|
| **Build Pack** / **Build Type** | **Dockerfile** |
| **Build Context** / **Root Directory** / **Build Context Path** | `saliency-service` |
| **Dockerfile Path** / **Dockerfile-Pfad** | `Dockerfile` |

**Wichtig:** Der Build-Kontext ist bereits `saliency-service` – der Dockerfile liegt darin, also nur **`Dockerfile`** angeben (nicht `saliency-service/Dockerfile`), sonst sucht Coolify fälschlich `saliency-service/saliency-service`.

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
| `SALIENCY_SERVICE_URL` | `http://<Container-ID-von-Saliency>:8000` |

**Wichtig:** Statt des App-Namens die **Container-ID** aus Schritt 5.4 verwenden (z. B. `http://rc8gsg4kcwc8k0wsgo484w80:8000`). Der App-Name wie `checkion-saliency` funktioniert in Coolify oft nicht für Container-zu-Container-Verbindungen – nur die angezeigte interne ID. **Immer `http://` verwenden**, nicht `https://` – der Saliency-Container hat keinen TLS-Server; bei HTTPS entsteht im CHECKION-Log „SSL packet length too long“ und keine Heatmap.

### Schritt 8: CHECKION neu deployen

1. **Redeploy** / **Deploy** ausführen, damit die neue Variable geladen wird.

---

## Kurz-Checkliste

- [ ] **Teil A:** Neue App mit GitHub (gleiches Repo), Build Pack = Dockerfile, Dockerfile Path = `saliency-service/Dockerfile`, Build Context = `saliency-service`, Port = `8000`, Env `WEIGHTS_FOLDER_ID=10tZL7oNfaRkBHHTeqjog0ZIJacrr2Ya0`, deployen, interne URL notieren.
- [ ] **Teil B:** In CHECKION Env `SALIENCY_SERVICE_URL=http://<saliency-app-name>:8000` eintragen, CHECKION redeployen.

Danach werden bei jedem neuen Scan die Attention-Heatmaps asynchron berechnet und auf der Ergebnis-Seite angezeigt, sobald sie fertig sind.

---

## Optional: SUM-Backend (speziell für Webseiten/UI)

Für **auf Webseiten optimierte** Heatmaps (Headlines, CTAs, UI-Elemente wie bei EyeQuant) kannst du statt MDS-ViTNet den **SUM**-Backend nutzen:

- In **Teil A** (Saliency-Service): **Dockerfile Path** auf **`Dockerfile.sum`** setzen (Build Context bleibt `saliency-service`).
- **Weights:** SUM verwendet eine einzige Datei `sum_model.pth`. Entweder:
  - **Volume** anlegen und unter dem Container-Pfad `/app/SUM/net/pre_trained_weights` die Datei `sum_model.pth` ablegen (Download: [Google Drive](https://drive.google.com/file/d/14ma_hLe8DrVNuHCSKoOz41Q-rB1Hbg6A/view)), oder
  - Eine **direkte Download-URL** für `sum_model.pth` als Env **`SUM_WEIGHTS_URL`** setzen (der Container lädt beim Start).
- Port und **SALIENCY_SERVICE_URL** in CHECKION wie oben; Health-Check liefert dann `"model": "SUM", "condition": "UI (web pages)"`.

---

## Fehler: „fetch failed“ / 502 / Timeout

Wenn CHECKION **„fetch failed“**, **502 Bad Gateway** oder **„The operation was aborted due to timeout“** (bzw. „Saliency-Anfrage Zeitüberschreitung“) anzeigt:

1. **Timeout („operation was aborted due to timeout“)**  
   Die Berechnung kann auf CPU **1–3 Minuten** dauern. CHECKION wartet bis zu **3 Minuten**.  
   - Kommt die Meldung trotzdem: **SALIENCY_SERVICE_URL** prüfen (siehe unten) und sicherstellen, dass CHECKION und Saliency im **gleichen Netz** laufen.  
   - In den **Saliency-Logs** prüfen: Kommt **POST /predict** an und antwortet der Service? Wenn ja, aber CHECKION bricht ab, liegt oft die URL/Netzwerk-Konfiguration auf CHECKION-Seite.

2. **Container-ID statt App-Namen nutzen**  
   In Coolify bei der **Saliency**-App die **interne Container-ID** finden (Auge-Symbol oder „Internal URL“ / Netzwerk-Details).  
   In CHECKION unter **Environment Variables** eintragen:  
   **`SALIENCY_SERVICE_URL`** = **`http://<diese-Container-ID>:8000`**  
   (z. B. `http://rc8gsg4kcwc8k0wsgo484w80:8000`). CHECKION danach **neu deployen**.

3. **Gleicher Server / Projekt**  
   CHECKION und Saliency müssen auf dem **gleichen Coolify-Server** (und idealerweise im gleichen Projekt) laufen, damit sie sich im internen Netz erreichen können.

4. **Saliency-Logs prüfen**  
   Beim Klick auf „Heatmap jetzt berechnen“ in den **Saliency**-Logs nach **POST /predict** suchen. Kommt keine Anfrage an, erreicht CHECKION den Container nicht (falsche ID oder anderes Netz).
