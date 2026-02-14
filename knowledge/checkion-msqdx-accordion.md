# CHECKION – MSQDX Accordion (Results Issue List)

## Erweiterte Komponente

Die **Issues-Tabelle** auf der Results-Page nutzt die erweiterte **MsqdxAccordion** aus dem msqdx-design-system.

- **MsqdxAccordionItem** wurde um optionale Props ergänzt:
  - `wrapperRef?: (el: HTMLDivElement | null) => void` – z. B. für scroll-into-view
  - `highlighted?: boolean` – programmatische Hervorhebung (z. B. Sync mit visueller Ansicht)
  - `highlightColor?: string` – Farbe für Highlight und Hover (CSS-only, kein Re-Render)
- Implementierung: `msqdx-design-system/packages/react/src/components/molecules/Accordion/MsqdxAccordion.tsx`

## Nutzung in CHECKION

- **ScanIssueList** rendert `MsqdxAccordion` mit `ScanIssueItem` pro Issue.
- **ScanIssueItem** rendert nur noch **MsqdxAccordionItem** mit `wrapperRef`, `highlighted`, `highlightColor` (Severity-Farbe); kein eigenes Wrapper-Box mehr.
- Hover-Highlight ist rein per CSS in der DS-Komponente → kein Flimmern durch State-Updates beim Hover.

## Referenzen

- Results-Page: `app/results/[id]/page.tsx`
- Liste: `components/ScanIssueList.tsx`, `components/ScanIssueItem.tsx`
