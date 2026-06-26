# CHECKION – GEO im Projekt: Troubleshooting

## Browser-Konsolenfehler „message channel closed“

```
Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true,
but the message channel closed before a response was received
```

**Ursache:** Fast immer eine **Browser-Extension** (Passwort-Manager, Adblocker, Grammarly, Übersetzer, …), nicht CHECKION.

**Typisch:** Beim Klick auf „GEO starten“ oder beim Wechsel zur GEO-Ergebnisseite (`/geo-eeat/[jobId]`).

**Was tun:**

1. Seite im **Inkognito-Fenster ohne Extensions** testen
2. Im **Network-Tab** prüfen, ob `POST /api/scan/geo-eeat` und `GET /api/projects/[id]/geo-*` **200** liefern
3. Extensions nacheinander deaktivieren

Erkennung im Code: `lib/http/fetch-json.ts` → `isBrowserExtensionMessageChannelError()`.

## GEO-Check starten (Projekt)

Route: `/projects/[id]/geo`

1. Projekt braucht **Domain** (`projects.domain`)
2. Für **Competitive GEO** mindestens **GEO-Fragen** oder **Competitors** im Projekt
3. Start ruft `POST /api/scan/geo-eeat` mit `projectId` auf → Redirect zu `/geo-eeat/[jobId]`

## Relevante APIs

| Endpoint | Zweck |
|----------|--------|
| `GET /api/projects/[id]/geo-summary` | Score + letzte Runs |
| `GET /api/projects/[id]/geo-question-history` | Fragen-Trends |
| `GET /api/scan/geo-eeat/history?projectId=` | Run-Liste |
| `POST /api/scan/geo-eeat` | Neuen GEO-Job starten |

Pfade: `lib/constants.ts` (`apiProjectGeoSummary`, `apiScanGeoEeatCreate`, …).

## UI-Robustheit

`app/projects/[id]/geo/page.tsx` lädt APIs mit `Promise.allSettled` — ein fehlgeschlagener Teil-Request blockiert nicht mehr die gesamte Seite.
