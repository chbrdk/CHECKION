# GEO / E-E-A-T – LLM-Modelle (Stand 03.06.2026)

Zentrale Konfiguration: `lib/llm/config.ts`

## Competitive Benchmark (SoV, Zitationen)

| Provider | Modelle | API-ID |
|----------|---------|--------|
| OpenAI | Nano / Mini / Frontier | `gpt-5.4-nano`, `gpt-5.4-mini`, `gpt-5.5` |
| Anthropic | Opus / Sonnet / Haiku | `claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001` |
| Google | Flash / Lite / Pro | `gemini-3.5-flash`, `gemini-3.1-flash-lite`, `gemini-3.1-pro-preview` |

## On-Page GEO / E-E-A-T (ein Modell)

- Default: `OPENAI_MODEL` → `gpt-5.4-nano` (Override per Env)
- Vorschläge (Keywords/Wettbewerber): `OPENAI_SUGGEST_MODEL` → Default `gpt-5.4-nano`

## Hinweise

- **Claude Sonnet 4.8** existiert per Anthropic-Docs (Juni 2026) nicht; aktuelles Sonnet bleibt **4.6**.
- **Gemini 2.0 Flash** wurde am **01.06.2026** abgeschaltet → Migration auf 3.5 Flash / 3.1 Flash Lite.
- **GPT-5.5** ist seit April 2026 in der API; teurer als 5.4 – nur als Frontier-Stufe im Benchmark-Trio.
- Alte Scan-Ergebnisse behalten historische `modelId`-Keys (z. B. `gpt-5-nano`); neue Scans nutzen die IDs oben.

## Tests

- `__tests__/lib/llm-config-geo-models.test.ts`

## Quellen (Recherche 03.06.2026)

- OpenAI: [GPT-5.5](https://developers.openai.com/api/docs/models/gpt-5.5), [GPT-5.4 mini/nano](https://openai.com/index/introducing-gpt-5-4-mini-and-nano/)
- Anthropic: [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview)
- Google: [Gemini 3.5 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash), [Release notes 2026-06-01](https://ai.google.dev/gemini-api/docs/changelog)
