# GEO / E-E-A-T: Interaktive Darstellungen im msqdx Design

## Aktueller Stand

| Sektion | Darstellung | Interaktivität |
|---------|-------------|----------------|
| **On-Page** | Chips für GEO-Score, E-E-A-T Signale, technische Werte; E-E-A-T Scores als Chips (x/5); GEO-Fitness als Text | Keine |
| **Empfehlungen** | Nummerierte Liste | Keine |
| **Competitive Benchmark** | SoV-Balken (relativ zu max), Pro-Frage-Karten mit Citations | Keine |

## Verbesserungen (msqdx-konform)

### 1. Competitive Benchmark
- **SoV-Balken**: Hover-Tooltip mit Details (SoV %, Ø Pos, Nennungen)
- **Per-Frage**: MsqdxAccordion – auf-/zuklappbar, reduziert visuelle Dichte
- **Domain-Filter** (optional): Klick auf Domain-Chip filtert/highlighted nur diese Domain in allen Karten
- **Stacked-Bar** (optional): alternative 100 %-Ansicht aller Domains in einem Balken

### 2. On-Page (E-E-A-T + GEO)
- **E-E-A-T Scores**: horizontale Mini-Balken (1–5) mit Farbverlauf (rot → gelb → grün), wie PerformanceCard
- **GEO-Fitness**: horizontaler Balken 0–100 mit Farbzonen
- **E-E-A-T Signale**: als visuelle Checkliste mit Icons (Check/X)

### 3. Empfehlungen
- **MsqdxAccordion**: jede Empfehlung auf-/zuklappbar, Priorität als kleines Badge

## Referenzen
- Accordion: `MsqdxAccordion`, `MsqdxAccordionItem` (results page, UxIssueList)
- Hover: `hoveredRegionId` in results page; `'&:hover': { ... }` Pattern
- Balken: PerformanceCard, SeoCard (keyword bars)
