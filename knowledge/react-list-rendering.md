# Listen & Tabellen: Rendering-Performance (CHECKION)

Nicht die gesamte App mit `React.memo` ausstatten. **Priorität:** lange Listen, Virtualisierung (`@tanstack/react-virtual`, `VirtualScrollList`), und Views unter **häufig aktualisiertem** State (React Query, Context).

## Checkliste

1. **Stabile `key`s** in Listen (`id`, URL, fachlicher Key) — kein `key={index}` bei sortierbaren/aktualisierbaren Daten.
2. **Zeilen als `memo`-Komponente** auslagern, wenn der Parent oft neu rendert (Scroll, Query-Refetch), die Zeilendaten aber gleich bleiben.
3. **`useCallback`** für Handler, die an memo-Kinder gehen (`onOpen`, `onPageClick`), sofern der Parent sie nicht ohnehin stabil hält.
4. **`useMemo`** für JSX-Fragmente, die als Props durchgereicht werden (z. B. `paginationFooter`), damit `memo`-Tabellen nicht wegen neuer Objekt-Referenzen jedes Mal mitrendern.
5. **TanStack Query:** `placeholderData: keepPreviousData` bei Pagination, damit Daten nicht kurz auf `[]` springen.
6. **Flex + Scroll:** scrollende Bereiche oft mit **`minHeight: 0`** / **`minWidth: 0`** (siehe `checkion-domain-scan-storage.md`).

## Referenz im Code

- `components/ScannedPagesTable.tsx` + `ScannedPagesTableRow.tsx`
- `components/DomainAggregatedIssueList.tsx` + `AggregatedIssueTableRow.tsx`
- `components/ScanIssueList.tsx` + `ScanIssueRow.tsx` (bereits memo)
- `components/domain/SeoDensityScrollRow.tsx` — Links & SEO (bekommt `t` vom Parent, kein `useI18n` pro Zeile)
- `DomainResultLinksSeoSection.tsx` — `DomainResultSeoPanel` (Query + VirtualScrollList) und `DomainResultLinksPanel` getrennt per `memo`, damit SEO-Fetch die Links-Karte nicht neu rendert
- `SystemicIssueScrollRow.tsx` — Overview Systemic Issues
- `GenerativePageScrollRow.tsx` — GEO pro Seite
- `StructureUrlScrollRow.tsx` — Struktur-Tab (mehrere H1 / übersprungene Level)
- `UxBrokenLinkScrollRow.tsx` — UX Audit kaputte Links
- `VisualUxUrlCountScrollRow.tsx` — Visuelle Analyse (Focus / Touch Targets)
- `components/domain/DomainResultOverviewSection.tsx` — `useMemo` für `slimPaginationFooter`
- `DomainResultOverviewLeftColumn.tsx` — linke Overview-Spalte (Score, Issues, E-E-A-T) per `memo` von Slim-Pages-Query entkoppelt
- `DomainResultNav.tsx` — Tab-Leiste nur `memo` + `useI18n`, nicht `DomainScanContext` (weniger Flackern bei Journey/Refetch)
- `DomainScanContext`: Bundle-Query `staleTime` / `refetchOnWindowFocus: false`; Slim-Pages in Overview ebenfalls `refetchOnWindowFocus: false`
- `VirtualChipList.tsx` — viele `MsqdxChip` in einem Bereich: unter `VIRTUAL_CHIP_LIST_INLINE_THRESHOLD` weiter flex-wrap, darüber vertikale Virtualisierung (`VirtualScrollList`); Konstanten in `lib/constants.ts`
