# CHECKION – Issues-Liste (Results Page)

## Aktuell: Native MSQDX Accordion

Die **Issues-Liste** auf der Results-Page nutzt die **MsqdxAccordion** aus dem Design-System.

- **ScanIssueList** rendert einen Container (overflow, maxHeight 65vh, contain: layout) und darin **MsqdxAccordion** mit **ScanIssueItem** pro Issue.
- **ScanIssueItem** ist ein Wrapper (Box mit ref, `data-row-index`) um **MsqdxAccordionItem** (summary: Schwere, Meldung, Chips; children: Selector, HTML-Kontext).
- **Flimmer-Fix (Liste):** Hervorhebung per CSS (`data-highlighted-index` / `data-row-index`), kein `isHighlighted` an Items.
- **Flimmer-Fix (DS):** Im msqdx-design-system nutzt das Accordion ein **Subscription-Modell**: nur das geöffnete/geschlossene Item rendert neu (über `useExpanded(id)` + `subscribe`), der Context-Wert bleibt stabil; bei vertikalem Layout rendern die anderen Items nicht mit.
- Hover-Styles bleiben in ScanIssueItem (CSS); scroll-into-view über `registerRef`.

## Referenzen

- Results-Page: `app/results/[id]/page.tsx`
- Liste: `components/ScanIssueList.tsx`, `components/ScanIssueItem.tsx`
- Tabellen-Variante (ungenutzt): `components/ScanIssueRow.tsx`
