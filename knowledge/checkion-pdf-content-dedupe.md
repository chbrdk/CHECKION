# CHECKION PDF — Inhaltliche Dopplungen

Stand: Analyse Haftpflichtkasse-Report (2026-06-10) + Code-Fixes.

## Schwere Dopplungen (behoben oder reduziert)

| Muster | Wo | Maßnahme |
|--------|-----|----------|
| Deckblatt-Teaser = Exec-Absatz 1 | Cover + Kap. 1 | Cover nur noch `valueProposition`, kein Exec-Snippet |
| Agent-Summary + Metrik-Einordnungen | Quality, GEO, SEO | Section-`summary` in PDF entfernt; nur `metricInterpretations` |
| SEO On-Page + Rankings vermischt | Kap. 3 | Getrennt: On-Page vs. SERP-Rankings; keine Keyword-Karten + Agent-Summary |
| SERP-Tabelle 2× | SEO + Deep Kap. 11 | Deep: nur noch Ranking-Wettbewerber-Chart, keine Keyword-Tabelle |
| GEO-Wettbewerb 3× | Exec 1.1, GEO 4.2, Deep 10 | Exec-Wettbewerb aus wenn GEO/Deep-Benchmark vorhanden |
| Domain-Score-Wettbewerb 2× | Topics 5.1 + Deep Scoreboard | Topics-Wettbewerb aus wenn Deep-Benchmark existiert |
| Competitive Overview 2× | Deep 10 (Agent summary + overview) | Nur `competitiveOverview`, Summary nur als Fallback |
| Ähnliche Grautexte | überall | `dedupeInterpretationTexts()` in `PdfMetricInterpretationGroup` |

## Bewusst ähnlich (OK, aber kompakt halten)

| Muster | Empfehlung |
|--------|------------|
| Executive Summary ↔ Zentrale Erkenntnisse | Exec = Narrativ; Findings = Destillat. Synthesizer-Prompt: keine Wortwiederholung |
| Findings ↔ Maßnahmenplan | Findings = Problem, Plan = Lösung — OK |
| Personas ↔ Hauptkapitel | Persona-Sicht gewollt; Scores nur als Chips, nicht als Fließtext wiederholen |
| Systemische Issues ↔ Issue-Gruppen Anhang | Kap. 2 = interpretiert, Anhang = Rohliste |
| GEO Fitness Startseite | Kap. 4 + Deep On-Page GEO — Deep nur Detailseite, Einordnung einmal in Kap. 4 |
| KPI-Übersicht | Rohmetriken für Power-User; keine zweite Interpretationsschicht hinzufügen |

## Phase 2 (umgesetzt)

- Wettbewerbs-Insight-Karten: max. **3** (`gap` / `topic_gap` only) — Rest nur Overlap-Tabelle
- KPI-Übersicht: ohne Domain/SEO/GEO/Ranking/WCAG-Fehler/Keyword-Count (bereits in Scorecards/Kapiteln)
- Personas: max. **3** differenzierendste (statt 5)
- Zentrale Erkenntnisse: max. **4**, Dedupe vs. Executive Summary

## Phase 3 (umgesetzt)

- Wettbewerbs-Insight-Karten: Dedupe identischer Agent-Texte (`competitiveInsightRowsForPdf`)
- Topic-Overlap-Einordnung nur wenn keine Insight-Karten; SEO-Balken nur ohne Scoreboard
- GEO: max. **3** Insight-Karten; GEO-Empfehlungen nur ohne Maßnahmenplan
- Deep GEO-Seiten: max. **5**, kürzere Reasoning-Texte
- Issue-Gruppen-Anhang: ohne Titel aus systemischen Issues, max. 12
- Maßnahmenplan: max. **6**, Dedupe vs. Findings
- Personas: max. **2** Insights/Persona, ohne site-wide Boilerplate (WCAG-Zahlen etc.)
- Executive Domain Summary nur ohne systemische Issues im Quality-Kapitel

## Phase 4 (umgesetzt)

- Audience-Summary: Dedupe vor Render
- Synthesizer: max. 6 Empfehlungen, handlungsorientiert
- Grautext-Dedupe global in `PdfMetricInterpretationGroup`

## Noch manuell prüfen nach Re-Render

- Rank-Trend-Chart nur einmal (Haupt-SEO-Kapitel)

## Re-Render

`npm run dev` → http://localhost:3333/dev/pdf-print oder Report neu generieren.
