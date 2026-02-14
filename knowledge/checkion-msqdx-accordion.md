# CHECKION – Issues-Tabelle (Results Page)

## Aktuell: Reine Tabellen-Liste (kein Accordion)

Die **Issues-Tabelle** auf der Results-Page ist eine **reine Tabelle/Liste** ohne Accordion oder Collapse-Komponenten, um Flackern und Renderfehler zu vermeiden.

- **ScanIssueList** rendert einen Tabellen-Container mit Header-Zeile (Schwere, Meldung, Level, Runner, Code, Details) und pro Issue eine **ScanIssueRow**.
- **ScanIssueRow** ist eine Tabellenzeile (CSS Grid) mit festen Spalten; Zusatzinfos (Selector, HTML-Kontext) werden über natives **`<details>`/`<summary>`** ein- und ausgeklappt (kein React-State, kein Re-Render).
- Hover und programmatische Hervorhebung (`highlightedIndex`) laufen per CSS; `registerRef` bleibt für scroll-into-view.

## Referenzen

- Results-Page: `app/results/[id]/page.tsx`
- Tabelle: `components/ScanIssueList.tsx`, `components/ScanIssueRow.tsx`
- Alte Accordion-Variante (ungenutzt): `components/ScanIssueItem.tsx` (MsqdxAccordionItem)
