# CHECKION – Screenshot storage (local or S3)

Screenshots are stored **outside the database** (no base64 in DB → keine träge DB). Entweder lokales Dateisystem oder **S3** (empfohlen bei mehreren Instanzen).

- **Konfiguration**
  - **Lokal (Standard):** `SCREENSHOT_STORAGE=local` oder weglassen. `SCAN_SCREENSHOTS_PATH` optional, Default: `process.cwd() + '/data/screenshots'`.
  - **Coolify Persistent Storage:** Der Pfad **muss** mit dem Volume übereinstimmen. In Coolify unter „Storages“ ist der **Source Path** der Pfad *im Container*, an dem das Volume gemountet wird. Setze `SCAN_SCREENSHOTS_PATH` auf exakt denselben Wert, z. B.:
    - Wenn das Volume als **Source Path** `/screenshot` hat → `SCAN_SCREENSHOTS_PATH=/screenshot`
    - Wenn du `/screenshots` (Plural) nutzen willst → in Coolify Source Path auf `/screenshots` stellen und `SCAN_SCREENSHOTS_PATH=/screenshots`
    - Stimmen Source Path und Env-Variable nicht überein, schreibt die App in ein anderes Verzeichnis und die Dateien überleben Deployments nicht.
  - **S3 (geteilter Storage für alle Instanzen):**
    - `SCREENSHOT_STORAGE=s3`
    - `SCREENSHOT_S3_BUCKET` oder `S3_BUCKET` (Bucket-Name)
    - `SCREENSHOT_S3_PREFIX` optional (z. B. `screenshots`), Key wird `{prefix}/{scanId}.jpg`
    - `SCREENSHOT_AWS_REGION` oder `AWS_REGION` (Default: `eu-central-1`)
    - Credentials: `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`, oder IAM-Rolle / Default-Chain
- **Env-Keys zentral:** `lib/constants.ts` – `ENV_SCREENSHOT_STORAGE`, `ENV_SCREENSHOT_S3_BUCKET`, `ENV_SCREENSHOT_S3_PREFIX`, `ENV_SCREENSHOT_AWS_REGION`.
- **API:** `lib/screenshot-storage.ts` – `writeScreenshot(scanId, buffer)` und `readScreenshot(scanId)` sind **async**; `getScreenshotBase64(screenshot, scanId)` async für Saliency; `isFileScreenshot(screenshot)`.
- **Scanner:** Schreibt mit `await writeScreenshot(scanId, buffer)`, speichert URL `/api/scan/{id}/screenshot` in `result.screenshot`.
- **Auslieferung:** `GET /api/scan/[id]/screenshot` – Auth, dann Datei von Disk oder S3; bei Fehlen Platzhalter-SVG. Legacy data-URL wird weiterhin unterstützt.

Mit S3 haben alle Instanzen Zugriff auf dasselbe Bild; kein „Datei fehlt auf diesem Server“ mehr.
