# CHECKION – Issues-Liste (Results Page)

## Aktuell: Reine Tabellen-Liste (ohne Accordion)

Die **Issues-Liste** auf der Results-Page ist eine **reine Tabelle** ohne Accordion – stabil, kein Flackern.

- **ScanIssueList**: Tabellen-Container mit Header (Schwere, Meldung, Level, Runner, Code, Details) und pro Issue eine **ScanIssueRow**.
- **ScanIssueRow**: Eine Zeile mit festen Spalten; Zusatzinfos (Selector, HTML-Kontext) über natives **`<details>`/`<summary>`** (kein React-State).
- Hervorhebung per CSS (`data-highlighted-index` / `data-row-index`), kein Re-Render der Zeilen bei Highlight-Wechsel.

## Referenzen

- Results-Page: `app/results/[id]/page.tsx`
- Liste: `components/ScanIssueList.tsx`, `components/ScanIssueRow.tsx`
- Accordion-Variante (ungenutzt): `components/ScanIssueItem.tsx`
