# UX Check v2 – Claude Agent (DIN EN ISO 9241-110)

## Übersicht

Der UX/CX Check wurde neu aufgebaut: Ein **Claude-basierter Agent** führt eine heuristische Evaluation einzelner Webseiten gemäß **DIN EN ISO 9241-110:2020** (Dialogprinzipien) durch. Das Ergebnis wird strukturiert gespeichert und im Frontend dargestellt.

## Komponenten

| Komponente | Pfad | Beschreibung |
|------------|------|--------------|
| Typen + Zod | `lib/ux-check-types.ts` | `UxCheckProblem`, `UxCheckStructured`, `UxCheckV2Summary`, `isUxCheckV2Summary()` |
| System-Prompt | `lib/llm/ux-check-prompt.ts` | Vollständiger XML-Prompt (Rolle, Heuristik, Severity, Score, Ausgabeformat, strukturierter JSON-Block) |
| Agent | `lib/llm/ux-check-agent.ts` | `runUxCheckAgent(result, apiKey)` – baut Kontext aus Scan, ruft Claude auf, parst JSON-Block |
| API | `app/api/scan/[id]/ux-check/route.ts` | POST: Scan laden, Agent ausführen, Ergebnis in `llm_summary` speichern |
| Frontend | `app/results/[id]/page.tsx` | `UxCheckV2Content` zeigt Probleme, Positive Aspekte, Bewertungstabelle, Impact-Effort-Matrix, Handlungsempfehlungen |

## Speicherung

- **Spalte:** `scans.llm_summary` (jsonb, unverändert)
- **Format:** Objekt mit `version: 'ux-check-v2'`, `structured`, `reportMarkdown`, `modelUsed`, `generatedAt`
- Alte Summaries (ohne `version`) werden weiterhin angezeigt (Legacy-UI). Neue Ausführung überschreibt `llm_summary` mit dem v2-Format.

## Konfiguration

- **ANTHROPIC_API_KEY** (erforderlich für UX-Check): API-Key für Claude
- **UX_CHECK_CLAUDE_MODEL** (optional): Standard `claude-sonnet-4-20250514`; für Opus z. B. `claude-opus-4-6` setzen

## API

- **POST** `/api/scan/[id]/ux-check`  
  - Auth erforderlich  
  - Lädt Scan, baut Kontext aus `buildSummaryPayload(result)`, ruft Claude auf, parst strukturierten JSON-Block am Ende der Antwort, validiert mit Zod, speichert in DB  
  - Response: gespeichertes `UxCheckV2Summary`-Objekt

## Frontend

- Tab „UX/CX Check“: Wenn `llmSummary` vom Typ v2 (`isUxCheckV2Summary`), wird `UxCheckV2Content` gerendert (Probleme, Positive Aspekte, Bewertungstabelle, Impact-Effort-Matrix, Handlungsempfehlungen).
- Kein v2-Ergebnis: Button **„UX-Check starten“** → POST `/api/scan/[id]/ux-check` → Ergebnis wird in `result.llmSummary` gesetzt und neue UI angezeigt.

## Strukturierter JSON-Block (Claude-Ausgabe)

Der Prompt verlangt am Ende der Antwort einen Codeblock:

```json
{
  "structured": {
    "header": { "seitenTitel": "...", "url": "...", "analysdatum": "..." },
    "problems": [ { "title", "befund", "empfehlung", "heuristik", "severity" } ],
    "positiveAspects": [ "..." ],
    "ratingTable": [ { "kategorie", "unterkategorien", "score", "begruendung" } ],
    "impactEffortMatrix": [ { "problem", "impact", "effort", "prioritaet" } ],
    "recommendations": [ "..." ]
  }
}
```

Der Agent extrahiert diesen Block und validiert ihn mit `UxCheckStructuredSchema`.
