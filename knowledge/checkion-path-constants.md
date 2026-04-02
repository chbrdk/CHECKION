# CHECKION – Zentrale URL-/Path-Konstanten

**Stand:** Feb 2025 (Schritt 9 aus `checkion-improvement-opportunities.md`)

---

## Übersicht

Alle App-Routen und API-Pfade werden in `lib/constants.ts` zentral geführt. **Nicht hardcoden** – immer die Konstanten/Builder-Funktionen nutzen.

---

## App-Routen (Seiten)

| Konstante       | Wert            | Verwendung                         |
|----------------|-----------------|-------------------------------------|
| `PATH_HOME`    | `/`             | Dashboard                           |
| `PATH_SCAN`    | `/scan`         | Neuer Scan                          |
| `PATH_SCAN_DOMAIN` | `/scan/domain` | Domain-Scan Start/Progress   |
| `PATH_RESULTS` | `/results`      | Single-Scan-Ergebnis                |
| `PATH_DOMAIN`  | `/domain`       | Domain-Scan-Ergebnis                |
| `PATH_JOURNEY_AGENT` | `/journey-agent` | Journey-Agent-Ergebnis    |
| `PATH_GEO_EEAT`| `/geo-eeat`     | GEO/E-E-A-T-Ergebnis                |
| `PATH_SHARE`   | `/share`        | öffentliche Share-Seite             |
| `PATH_LOGIN`   | `/login`        | Login                               |
| `PATH_REGISTER`| `/register`     | Registrierung                       |
| `PATH_SETTINGS`| `/settings`     | Einstellungen                       |
| `PATH_HISTORY` | `/history`      | Scan-Historie                       |
| `PATH_DEVELOPERS` | `/developers` | Developer API                       |

### Path-Builder (dynamische Routen)

```ts
pathResults(id)           // /results/[id]
pathDomain(id, query?)    // /domain/[id]?...
pathScanDomain({ url, maxPages? })  // /scan/domain?url=...&maxPages=...
pathJourneyAgent(jobId)   // /journey-agent/[jobId]
pathGeoEeat(jobId)        // /geo-eeat/[jobId]
pathShare(token)          // /share/[token]
```

---

## API-Routen

### Base-URL (Subpath-Deployment)

Wenn die App unter einem Subpath läuft (z. B. `https://example.com/checkion`), setze **`NEXT_PUBLIC_APP_BASE_URL=/checkion`**. Dann bauen alle API-Pfade in `lib/constants.ts` die volle URL mit diesem Prefix (z. B. `/checkion/api/scan/domain/…/summary`). Ohne die Variable ist der Wert leer, die Pfade bleiben relativ (`/api/...`).

**404 auf GET /api/scan/domain/[id]/summary:** Die Route antwortet mit 404 und `{ "error": "Scan not found", "code": "DOMAIN_SCAN_NOT_FOUND" }`, wenn für die aktuelle User-ID kein Domain-Scan mit dieser ID existiert (gelöscht, falsche ID oder anderer User). Bei Deployment unter Subpath: `NEXT_PUBLIC_APP_BASE_URL` setzen, damit der Request den richtigen Pfad trifft.

### Basis-URLs

| Konstante        | Wert                 |
|-----------------|----------------------|
| `API_SCAN`      | `/api/scan`          |
| `API_SCANS`     | `/api/scans`         |
| `API_SCANS_DOMAIN` | `/api/scans/domain` |
| `API_SCAN_DOMAIN`  | `/api/scan/domain`  |
| `API_SCAN_JOURNEY_AGENT` | `/api/scan/journey-agent` |
| `API_SCAN_GEO_EEAT`      | `/api/scan/geo-eeat`      |
| `API_SALIENCY_GENERATE`  | `/api/saliency/generate`  |
| `API_SALIENCY_RESULT`    | `/api/saliency/result`   |
| `API_SHARE`     | `/api/share`          |
| `API_SEARCH`    | `/api/search`         |
| `API_JOURNEYS`  | `/api/journeys`       |
| `API_AUTH_REGISTER` | `/api/auth/register` |
| `API_AUTH_PROFILE` | `/api/auth/profile` |
| `API_AUTH_CHANGE_PASSWORD` | `/api/auth/change-password` |

### API-Builder (dynamische Pfade)

```ts
apiScan(id)                    // GET /api/scan/[id]
apiScanCreate                  // POST /api/scan
apiScanList({ limit?, page? }) // GET /api/scan?...
apiScanSummarize(id)           // POST /api/scan/[id]/summarize
apiScanScreenshot(id)          // GET /api/scan/[id]/screenshot

apiScanDomainCreate            // POST /api/scan/domain
apiScanDomainStatus(id)        // GET /api/scan/domain/[id]/status
apiScanDomainSummary(id)       // GET /api/scan/domain/[id]/summary
apiScanDomainSlimPages(id)     // GET /api/scan/domain/[id]/slim-pages?offset=&limit=
apiScanDomainSummarize(id)     // POST /api/scan/domain/[id]/summarize
apiScanDomainJourney(id)       // POST /api/scan/domain/[id]/journey

apiScanJourneyAgent(jobId)     // GET /api/scan/journey-agent/[jobId]
apiScanJourneyAgentCreate     // POST /api/scan/journey-agent
apiScanJourneyAgentHistory(limit?) // GET /api/scan/journey-agent/history
apiScanJourneyAgentLiveStream(jobId)
apiScanJourneyAgentVideo(jobId)

apiScanGeoEeat(jobId)         // GET /api/scan/geo-eeat/[jobId]
apiScanGeoEeatCreate          // POST /api/scan/geo-eeat
apiScanGeoEeatHistory(limit?)
apiScanGeoEeatSuggestQueries  // POST /api/scan/geo-eeat/suggest-competitors-queries

apiSaliencyResult(jobId, scanId)
apiShareByResource(type, id)
apiShareToken(token)
apiShareTokenAccess(token)
apiShareTokenVideo(token)
apiShareTokenPages(token, pageId)
apiShareTokenPagesScreenshot(token, pageId, accessToken?)

apiSearch(q, limit?)
apiScansDelete(id)
apiScansDomainList({ limit?, page? })
apiScansDomainDelete(id)
apiJourneysList({ limit?, page? })
apiJourneys(id)
```

---

## Tests

`__tests__/lib/constants-paths.test.ts` prüft die wichtigsten Path- und API-Builder.
