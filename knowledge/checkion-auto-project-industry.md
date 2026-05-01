# Automatische Projekt-Branche (CHECKION)

## Kurz

Nach einem **Deep Scan mit verknüpftem Projekt** wird `projects.industry` per **Claude Haiku** aus den **Domain-Content-Themen** (`aggregated.pageClassification.topThemes`) vorgeschlagen, sofern die Branche noch leer ist. Das Modell wählt **genau eine ID** aus dem festen **Branchen-Pool** (`lib/industry-pool.ts`), nicht Freitext.

## Ablauf

1. Deterministischer Rollup der Seiten-Themen → optional **Theme-Rollup-Refine** (bestehend).
2. **`maybeAutoFillProjectClassificationFromDomainScan`** (`lib/project-industry-auto.ts`): zuerst Tags aus Rollup (falls leer), dann Branche.
3. **`inferProjectIndustryWithLlm`** (`lib/llm/project-industry-infer.ts`): ein JSON `{ "industryId": string | null }`, gültige Pool-ID aus `lib/industry-pool.ts`.
4. **`updateProject`** + **`invalidateDomainList`**.
5. Usage-Event: `project_industry_infer` (PLEXON/Report analog zu anderen LLM-Events).

## Wann genau?

| Deep Scan `classifyPageTopics` | Branchen-Inferenz |
|-------------------------------|-------------------|
| aus / false | Direkt nach Scan-Ende (Themen aus damaligem Aggregat). |
| an / true | Nach **`runDomainScanPageClassificationJob`** + Payload-Refresh (reichere Themen). |

Ohne Projekt (`domain_scans.project_id` leer) passiert nichts.

## Env

| Variable | Wirkung |
|----------|---------|
| `CHECKION_DISABLE_AUTO_PROJECT_INDUSTRY=1` | Keine automatische Branche. |
| `CHECKION_AUTO_INDUSTRY_OVERWRITE=1` | Auch gesetzte Branche wird neu inferiert (bei erneutem Trigger). |
| `CHECKION_DISABLE_AUTO_PROJECT_TAGS=1` | Keine automatischen Projekt-Tags aus Rollup. |
| `CHECKION_AUTO_TAGS_OVERWRITE=1` | Bestehende Projekt-Tags durch Rollup-Tags ersetzen. |

Modell/Tokens: wie Theme-Rollup-Refine (`PAGE_TOPIC_ROLLUP_REFINE_CLAUDE_MODEL`, max. 512 Output-Tokens für diesen Call).

## Automatische Tags

`maybeAutoFillProjectTagsFromDomainScan` (über **`maybeAutoFillProjectClassificationFromDomainScan`**) setzt `projects.tags` aus **`topThemes`** (slug aus `themeTagKey` / `tag`), wenn noch keine Tags existieren — außer `CHECKION_AUTO_TAGS_OVERWRITE=1`. Danach **`syncDomainScanTagsForProjectId`**, damit verknüpfte Scans dieselben Tags tragen.

## Grenzen

- **Branche:** auch bei **0** `topThemes` läuft ein Haiku-Call mit **Domain + Projektname** (best-effort); bei leeren Themes kann das Ergebnis `null` sein.
- Qualität hängt von **Seiten-Klassifikation / Themen** ab; ohne `classifyPageTopics` sind oft weniger oder keine Rollup-Themen → dann keine Auto-Tags, aber weiterhin Domain-basierte Branche möglich.
