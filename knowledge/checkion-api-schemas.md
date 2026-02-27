# CHECKION – Zod API-Schemas

**Stand:** Februar 2025

---

## Modul

`lib/api-schemas.ts`

## Nutzung

```ts
import { parseApiBody, scanBodySchema } from '@/lib/api-schemas';

export async function POST(request: Request) {
  const parsed = await parseApiBody(request, scanBodySchema);
  if (parsed instanceof NextResponse) return parsed;
  // parsed ist typisiert und validiert
  const { url } = parsed;
}
```

## Schemas (routenspezifisch)

| Schema | Route |
|--------|-------|
| `scanBodySchema` | POST /api/scan |
| `scanDomainBodySchema` | POST /api/scan/domain |
| `journeyAgentBodySchema` | POST /api/scan/journey-agent |
| `domainJourneyBodySchema` | POST /api/scan/domain/[id]/journey |
| `geoEeatBodySchema` | POST /api/scan/geo-eeat |
| `registerBodySchema` | POST /api/auth/register |
| `changePasswordBodySchema` | POST /api/auth/change-password |
| `saliencyGenerateBodySchema` | POST /api/saliency/generate |
| `readabilityBodySchema` | POST /api/tools/readability |

## parseApiBody

- Liest `request.json()` und fängt JSON-Parse-Fehler ab → 400 "Invalid JSON"
- Validiert mit dem angegebenen Zod-Schema
- Bei Fehlern: formatiert erste Zod-Issue-Message → 400
- Bei Erfolg: gibt typisierte Daten zurück

## Erweiterung

Neue Schemas in `lib/api-schemas.ts` definieren und in der Route mit `parseApiBody(request, newSchema)` nutzen.
