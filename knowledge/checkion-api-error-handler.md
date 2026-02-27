# CHECKION – Zentrale API-Fehlerbehandlung

**Stand:** Februar 2025

---

## Modul

`lib/api-error-handler.ts`

## Funktionen

| Funktion | Verwendung |
|---------|------------|
| `apiError(message, status?, extras?)` | Explizite Fehlerantwort. Status default 500. Extras (z. B. `retryAfter`) werden in Body und ggf. Headers übernommen. |
| `handleApiError(e, options?)` | Für catch-Blöcke. Loggt, gibt 500 zurück. Optionen: `context` (Log-Prefix), `publicMessage` (Override für Client). |
| `internalError(publicMessage?)` | Fester 500 mit sicherer Nachricht. Default: „An unexpected error occurred.“ |

## Status-Konstanten

`API_STATUS`: `BAD_REQUEST` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `TOO_MANY_REQUESTS` (429), `INTERNAL_ERROR` (500), `BAD_GATEWAY` (502), `UNAVAILABLE` (503).

## Verwendung

```ts
import { apiError, handleApiError, API_STATUS } from '@/lib/api-error-handler';

// Explizite Fehler
if (!session?.user?.id) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
if (!body.url) return apiError('URL is required', API_STATUS.BAD_REQUEST);

// Rate Limit mit Retry-After
return apiError('Too many requests', API_STATUS.TOO_MANY_REQUESTS, { retryAfter: 60 });

// Catch-Block mit fester Nachricht
} catch (e) {
  return handleApiError(e, { context: 'Register failed', publicMessage: 'Registration failed.' });
}
```

## Migrierte Routen (alle)

- `app/api/scan/route.ts`, `scan/domain/route.ts`, `scan/[id]/route.ts`, `scan/[id]/screenshot/route.ts`, `scan/[id]/summarize/route.ts`, `scan/domain/[id]/summary/route.ts`, `scan/domain/[id]/status/route.ts`, `scan/domain/[id]/journey/route.ts`, `scan/domain/[id]/summarize/route.ts`
- `app/api/scan/journey-agent/route.ts`, `journey-agent/history/route.ts`, `journey-agent/[jobId]/route.ts`, `live/route.ts`, `live/stream/route.ts`, `video/route.ts`
- `app/api/scan/geo-eeat/route.ts`, `geo-eeat/[jobId]/route.ts`, `geo-eeat/[jobId]/status/route.ts`, `geo-eeat/history/route.ts`, `geo-eeat/suggest-competitors-queries/route.ts`
- `app/api/saliency/generate/route.ts`, `saliency/result/route.ts`
- `app/api/auth/register/route.ts`, `auth/profile/route.ts`, `auth/change-password/route.ts`
- `app/api/share/route.ts`, `share/[token]/route.ts`, `share/[token]/access/route.ts`, `share/[token]/video/route.ts`, `share/[token]/pages/[pageId]/route.ts`, `share/[token]/pages/[pageId]/screenshot/route.ts`, `share/by-resource/route.ts`
- `app/api/journeys/route.ts`, `journeys/[id]/route.ts`
- `app/api/scans/route.ts`, `scans/domain/route.ts`, `scans/domain/[id]/route.ts`, `scans/[id]/route.ts`
- `app/api/search/route.ts`
- `app/api/tools/contrast/route.ts`, `tools/readability/route.ts`, `tools/extract/route.ts`
