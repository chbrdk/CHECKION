# GEO / E-E-A-T Single-Page Score

## Overview

The **single-page** scan (one URL) produces a **GEO/E-E-A-T score** from 0–100 shown in the "Generative Engine Optimization" / Security Headers card. This score was previously built from a **50-point baseline** plus bonuses/penalties, so every page showed at least 50 unless robots blocked AI. It is now a **transparent 0–100 scale** with no baseline.

## Where

- **Computation:** `lib/geo-eeat-page-score.ts` — `computeGeoEeatPageScore()`
- **Usage:** `lib/scanner.ts` — after llms.txt/robots/schema and EEAT data are collected; result is stored in `result.generative.score` and `result.generative.scoreBreakdown`
- **UI:** Results page (GenerativeOptimizerCard), share view, domain aggregation (average of page scores)

## Formula (0–100, no baseline)

Ten factors, each worth **10 points** if present, **0** if absent:

| Factor | Description |
|--------|-------------|
| Robots erlauben AI | robots.txt does not block common AI crawlers (GPTBot, etc.) |
| llms.txt | Domain has `/llms.txt` and it was fetched successfully |
| Schema.org | Page has at least one JSON-LD schema type |
| Tabellen | At least one `<table>` on the page |
| FAQs | At least one FAQ-like segment detected |
| Zitate (>5) | More than 5 citation-like elements (blockquote/cite) |
| Autoren-Bio | Author bio or strong author signal detected |
| Impressum (E-E-A-T) | Impressum link/section present |
| Kontakt (E-E-A-T) | Contact link/section present |
| Über uns (E-E-A-T) | About us link/section present |

**Score = sum of points** (max 100). No extra “Basis” or floor.

## EEAT inclusion

E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) is included via the last three factors (Impressum, Kontakt, Über uns), which come from `eeatSignals` / `eeatPage` in the scan. So the same score reflects both **GEO readiness** (llms.txt, schema, structure) and **trust/experience signals** (impressum, contact, about).

## Changing weights or factors

Edit `lib/geo-eeat-page-score.ts`: adjust the `P` constant or add/remove `add()` calls and ensure the total possible still equals 100 if you want to keep a 0–100 scale. Update this knowledge file and any UI copy that explains the score.

## Tests

`__tests__/lib/geo-eeat-page-score.test.ts` — covers zero signals, robots-only, robots blocked, all present, EEAT factors, and citation threshold.
