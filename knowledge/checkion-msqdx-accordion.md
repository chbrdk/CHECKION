# CHECKION – Issues-Liste (Results Page)

## Aktuell: Native MSQDX Accordion

Die **Issues-Liste** auf der Results-Page nutzt die **MsqdxAccordion** aus dem Design-System.

- **ScanIssueList** rendert einen Container (overflow, maxHeight 65vh, contain: layout) und darin **MsqdxAccordion** mit **ScanIssueItem** pro Issue.
- **ScanIssueItem** ist ein Wrapper (Box mit ref, `data-row-index`) um **MsqdxAccordionItem** (summary: Schwere, Meldung, Chips; children: Selector, HTML-Kontext).
- **Flimmer-Fix:** Hervorhebung läuft per CSS über `data-highlighted-index` am Container und `data-row-index` an jedem Item – es wird **kein** `isHighlighted` an Items übergeben, damit sie bei Highlight-Wechsel nicht neu rendern.
- Hover-Styles bleiben in ScanIssueItem (CSS); scroll-into-view über `registerRef`.

## Referenzen

- Results-Page: `app/results/[id]/page.tsx`
- Liste: `components/ScanIssueList.tsx`, `components/ScanIssueItem.tsx`
- Tabellen-Variante (ungenutzt): `components/ScanIssueRow.tsx`
