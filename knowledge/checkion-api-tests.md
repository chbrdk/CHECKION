# CHECKION – API-Tests

**Stand:** Februar 2025

---

## Setup

- **Vitest** als Test-Runner (ohne Jest)
- **vite-tsconfig-paths** für `@/*` Pfad-Auflösung
- Tests in `__tests__/api/`

## Skripte

| Befehl | Beschreibung |
|--------|--------------|
| `npm run test` | Alle Vitest-Tests einmal ausführen |
| `npm run test:watch` | Vitest im Watch-Modus |
| `npm run test:api` | Nur API-Tests in `__tests__/api/` |

## Getestete Endpoints

| Endpoint | Tests |
|----------|-------|
| `GET /api/health` | 200 + `{ status: 'ok' }` |
| `POST /api/auth/register` | 400 bei fehlender E-Mail, ungültiger E-Mail, zu kurzem Passwort |
| `POST /api/scan` | 401 wenn unauthentifiziert, 400 bei fehlender/ungültiger URL |

## Mocking

- **auth** (`@/auth`) wird in `scan.test.ts` mit `vi.mock` gemockt, um unauthentifizierte Requests zu simulieren
- **Datenbank** wird bei Auth-Register-Validierungstests nicht aufgerufen (Validierung läuft vor `getDb()`)

## Bestehende Lib-Tests (tsx)

Weiterhin separat ausführbar:

- `npm run test:saliency-fusion`
- `npm run test:scanpath`

Diese nutzen `assert` und `npx tsx`, nicht Vitest.
