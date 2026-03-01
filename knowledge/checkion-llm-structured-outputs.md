# LLM Structured Outputs / JSON Mode (OpenAI)

## Referenz

- [Structured model outputs | OpenAI API](https://developers.openai.com/api/docs/guides/structured-outputs/)
- Vorteile: schema-konforme JSON-Antworten, weniger Retries/Parse-Fehler, explizite Refusals

## Aktueller Stand im Projekt

| Stelle | Aufrufe | Verarbeitung | Sinnvolle Umstellung |
|--------|---------|--------------|----------------------|
| **Competitive Benchmark** (`lib/geo-eeat/competitive-benchmark.ts`) | 1. Query → Freitext-Antwort<br>2. Antwort → `extractCitationsFromText()` (zweiter LLM-Call) → JSON parsen | `extractJsonFromResponse()` + manuelles Parsing | **Structured Output:** 1 Call pro Query mit `response_format` → direkt `{ citations: [{ domain, position }] }`, zweiter Call entfällt |
| **E-E-A-T / GEO / Empfehlungen** (`lib/geo-eeat/run-llm-stages.ts`) | je 1 Call pro Seite (E-E-A-T, GEO), 1 Call für Empfehlungen | `extractJsonFromResponse()` + eigene Parser | **Structured Output:** gleiche Prompts, `response_format` mit JSON-Schema → weniger Parse-Fehler |
| **Suggest Competitors/Queries** (`app/api/scan/geo-eeat/suggest-competitors-queries/route.ts`) | 1 Call | JSON aus Content parsen | Optional: Structured Output für festes Schema |
| **Summarize (Scan/Domain)** | 1 Call | `extractJsonFromResponse()` | Optional: Structured Output |
| **Journey Agent** (`lib/llm/journey-agent.ts`) | Tool-Calls + teils JSON in Content | `extractJsonFromResponse()` für Agent-Antwort | Optional: Schema für Antworten |

## Empfohlene Modelle für Structured Outputs

Laut OpenAI-Doku unterstützen **Structured Outputs** (json_schema):

- `gpt-4o-mini`, `gpt-4o-mini-2024-07-18`
- `gpt-4o-2024-08-06` und neuere Snapshots

Ältere Modelle (z. B. `gpt-4-turbo`) nutzen ggf. nur **JSON Mode** (`response_format: { type: "json_object" }`) – garantiert nur gültiges JSON, kein Schema.

Für den **Competitive Benchmark** und andere GEO/EEAT-LLM-Calls: `OPENAI_MODEL=gpt-4o-mini` oder `gpt-4o` setzen, wenn Structured Outputs genutzt werden.

## Competitive Benchmark – Schema (1 Call) ✅ umgesetzt

- **Ein** Call pro Query mit `response_format: CITATIONS_RESPONSE_FORMAT` (siehe `lib/geo-eeat/competitive-benchmark.ts`).
- Schema: `{ citations: [{ domain: string, position: integer }] }`; `domain` lowercase ohne Protokoll, `position` 1-basiert.
- System-Prompt nennt erwartete Domains (target + Konkurrenz), damit das Modell Firmennamen auf diese Domains mappt.
- **Ergebnis:** Kein zweiter Call mehr, weniger Kosten, stabilere Positionen. Empfohlen: `OPENAI_MODEL=gpt-4o-mini` oder `gpt-4o`.

## Multi-Model Competitive Benchmark ✅ umgesetzt

- **OpenAI:** Jede Frage wird mit `gpt-5-nano`, `gpt-5-mini`, `gpt-5` ausgeführt (`COMPETITIVE_BENCHMARK_MODELS` in `lib/llm/config.ts`). Erfordert `OPENAI_API_KEY`.
- **Claude (Anthropic):** Zusätzlich werden bei gesetztem `ANTHROPIC_API_KEY` die Modelle `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001` abgefragt (Stand 1.3.2026, `COMPETITIVE_BENCHMARK_MODELS_CLAUDE`). Claude nutzt prompt-basiertes JSON (kein Structured Output).
- API speichert `competitiveByModel: Record<string, CompetitiveBenchmarkResult>` (ein Eintrag pro Modell, OpenAI + Claude).
- Dashboard: Tabs pro Modell, gleiche SoV-Übersicht und „Pro Frage“-Details je Modell.

## E-E-A-T / GEO / Empfehlungen – mögliche Schemas

- **E-E-A-T:** Objekt mit `trust`, `experience`, `expertise` (jeweils `score`, `reasoning`), optional `authoritativeness`.
- **GEO Fitness:** Objekt mit `score`, `reasoning`, `missingElements` (string[]).
- **Empfehlungen:** Array von `{ priority, title, description, affectedUrls?, dimension? }`.

Diese könnten in `run-llm-stages.ts` mit `response_format` und passendem JSON-Schema versehen werden (gleiche Logik, nur garantierte Form).
