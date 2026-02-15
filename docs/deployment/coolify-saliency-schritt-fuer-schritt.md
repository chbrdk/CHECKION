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

1. **Name** der Anwendung: z. B. `checkion-saliency` (merken für Teil B).
2. **Deploy** ausführen.
3. Warten, bis der Build durch ist und der Container läuft.
4. **Interne URL** notieren: In Coolify bei der Saliency-Anwendung unter **General** / **Networking** / **Domain** oder in den Logs steht, unter welchem Hostnamen der Dienst erreichbar ist. Typisch:  
   **`http://checkion-saliency:8000`**  
   (Der Hostname ist oft der **Application Name** in Kleinbuchstaben ohne Sonderzeichen. In Coolify ggf. unter „Internal“ oder „Service URL“ nachsehen.)

---

## Teil B: CHECKION – Saliency-URL eintragen

### Schritt 6: CHECKION-Anwendung öffnen

1. In Coolify die **bestehende CHECKION-Anwendung** öffnen (nicht die neue Saliency-App).

### Schritt 7: Umgebungsvariable setzen

1. **Environment Variables** / **Variables** / **Env** öffnen.
2. Neue Variable hinzufügen:

| Name | Wert |
|------|------|
| `SALIENCY_SERVICE_URL` | `http://checkion-saliency:8000` |

**Hinweis:** `checkion-saliency` durch den **exakten Namen** ersetzen, den Coolify für die Saliency-Anwendung als Hostname nutzt. Wenn die App in Coolify z. B. „Saliency“ heißt und Coolify den Hostnamen `saliency` vergibt, dann:  
`http://saliency:8000`

### Schritt 8: CHECKION neu deployen

1. **Redeploy** / **Deploy** ausführen, damit die neue Variable geladen wird.

---

## Kurz-Checkliste

- [ ] **Teil A:** Neue App mit GitHub (gleiches Repo), Build Pack = Dockerfile, Dockerfile Path = `saliency-service/Dockerfile`, Build Context = `saliency-service`, Port = `8000`, Env `WEIGHTS_FOLDER_ID=10tZL7oNfaRkBHHTeqjog0ZIJacrr2Ya0`, deployen, interne URL notieren.
- [ ] **Teil B:** In CHECKION Env `SALIENCY_SERVICE_URL=http://<saliency-app-name>:8000` eintragen, CHECKION redeployen.

Danach werden bei jedem neuen Scan die Attention-Heatmaps asynchron berechnet und auf der Ergebnis-Seite angezeigt, sobald sie fertig sind.
