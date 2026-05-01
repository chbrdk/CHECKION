# Automatische Projekt-Branche (CHECKION)

## Kurz

Nach einem **Deep Scan mit verknüpftem Projekt** wird `projects.industry` per **Claude Haiku** aus den **Domain-Content-Themen** (`aggregated.pageClassification.topThemes`) vorgeschlagen, sofern die Branche noch leer ist. Das Modell wählt **genau eine ID** aus dem festen **Branchen-Pool** (`lib/industry-pool.ts`), nicht Freitext.

## Ablauf

1. Deterministischer Rollup der Seiten-Themen → optional **Theme-Rollup-Refine** (bestehend).
2. **`maybeAutoFillProjectIndustryFromDomainScan`** (`lib/project-industry-auto.ts`) lädt Projekt + neueste Payload.
3. **`inferProjectIndustryWithLlm`** (`lib/llm/project-industry-infer.ts`): ein JSON `{ "industry": string }`, normalisiert mit `normalizeIndustry` (max. 128 Zeichen).
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

Modell/Tokens: wie Theme-Rollup-Refine (`PAGE_TOPIC_ROLLUP_REFINE_CLAUDE_MODEL`, max. 512 Output-Tokens für diesen Call).

## Grenzen

- Mindestens **2** `topThemes`, sonst kein LLM-Call.
- Qualität hängt von **Seiten-Klassifikation / Themen** ab; reine Navigation/Boilerplate kann zu leerem `industry` führen (Modell darf `""` liefern).
- **Tags** am Projekt werden hier **nicht** automatisch gesetzt (nur `industry`).
