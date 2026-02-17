# CHECKION – Screenshot storage (file-based)

Screenshots are stored as files on the server instead of base64 in the DB to keep payloads small and avoid "Invalid string length" on large domain scans.

- **Config:** `SCAN_SCREENSHOTS_PATH` (optional). Default: `process.cwd() + '/data/screenshots'`. Created automatically.
- **API:** `lib/screenshot-storage.ts` – `writeScreenshot(scanId, buffer)`, `readScreenshot(scanId)`, `getScreenshotBase64(screenshot, scanId)` for saliency, `isFileScreenshot(screenshot)`.
- **Scanner:** Generates `scanId` at start of `runScan`, takes screenshot as Buffer, writes via `writeScreenshot`, stores URL `/api/scan/{id}/screenshot` in `result.screenshot`.
- **Serving:** `GET /api/scan/[id]/screenshot` – auth, then serves file from disk or decodes legacy data URL.
- **Backward compat:** Frontend uses `result.screenshot` as `<img src>`; works for both data URLs (old) and `/api/scan/.../screenshot` (new). Saliency uses `getScreenshotBase64()` so both storage forms work.
