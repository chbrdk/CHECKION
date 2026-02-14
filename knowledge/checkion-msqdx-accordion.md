# CHECKION – MSQDX Accordion (Results Issue List)

## Aktuell: Wrapper in CHECKION (deployment-kompatibel)

- **Deployment** (Coolify/Docker) baut das Design-System aus **GitHub** (`chbrdk/msqdx-design-system`). Dort ist die Accordion-Erweiterung ggf. noch nicht released.
- **ScanIssueItem** nutzt daher **keine** erweiterten Props (`wrapperRef`, `highlighted`, `highlightColor`), sondern eine eigene **Box** um **MsqdxAccordionItem**: Ref, Highlight und Hover-Styles liegen in CHECKION (rein per CSS, kein State beim Hover → kein Flimmern).
- **ScanIssueList** rendert `MsqdxAccordion` mit `ScanIssueItem` pro Issue.

## Optionale DS-Erweiterung (lokal/geplant)

Im Repo msqdx-design-system wurde **MsqdxAccordionItem** optional erweitert um:
- `wrapperRef`, `highlighted`, `highlightColor`
- Siehe `msqdx-design-system/packages/react/.../Accordion/MsqdxAccordion.tsx`

Sobald diese Version auf GitHub ist und im Docker-Build verwendet wird, kann ScanIssueItem auf die DS-Props umgestellt werden (Wrapper-Box entfernen, Props durchreichen).

## Referenzen

- Results-Page: `app/results/[id]/page.tsx`
- Liste: `components/ScanIssueList.tsx`, `components/ScanIssueItem.tsx`
