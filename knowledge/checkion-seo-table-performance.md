# SEO On-Page Table – Performance & Tech Stack

## Tech Stack (Stand: Projekt)

- **Next.js** 16.1.6 (webpack)
- **React** 19.2.4
- **MUI** 7.3.5 + **Emotion** (CSS-in-JS)
- **MSQDX** (`@msqdx/react`, `@msqdx/tokens`) – lokales Design-System

## Bekannte MUI/React-19-Themen

- MUI X DataGrid: Re-Renders bei `ref`-Props (GridRootPropsContext).
- MUI Tooltip: unnötige Re-Renders von Children; Memoization empfohlen.
- Allgemein: Barrel-Imports vermeiden, schwere Komponenten lazy laden.

## Umgesetzte Optimierungen (SeoOnPageTable)

1. **SortHeader außerhalb der Tabelle**  
   `SortHeaderCell` als eigene, stabile Komponente – kein neuer „Component-Type“ pro Render, weniger Remounts der Header-Zeile.

2. **Memoisierte Zeilen**  
   `TableRow` mit `React.memo`, damit sich nur geänderte Zeilen neu rendern.

3. **Stabile Callbacks**  
   `handleSort` und `structureLabel` mit `useCallback`, damit sich Referenzen nicht bei jedem Render ändern.

4. **Layout-Containment**  
   `contain: 'layout'` am Scroll-Container, um Layout-Berechnungen zu begrenzen.

5. **Pagination**  
   Nur ~50 Zeilen pro Seite werden gerendert (DOM-Größe begrenzt).

## Zentrale Konstanten

- Seitengröße Tabelle: `DOMAIN_ISSUES_TABLE_PAGE_SIZE` (z. B. 50).

## Debug-Log-Auswertung (Session cafcc0)

- **H1 (exzessive Re-Renders):** Verworfen. SEO-Seite 2 Renders, Tabelle 3 Renders über ~15 s – kein Runaway, aber jeder Re-Render mit 50 Zeilen teuer.
- **H2 (Viewport löst Re-Renders aus):** Unklar; Viewport-Event einmal.
- **H6 (Resize-Loop):** Verworfen. Nur 1 Resize-Event, kein Loop.
- **Folgerung:** Hohe Kosten pro Re-Render (viele Zeilen × MUI). Maßnahmen: (1) Stacking Context (`isolation`, `zIndex: 2`), (2) `content-visibility: auto` + `containIntrinsicSize` pro Zeile, (3) **SEO_TABLE_PAGE_SIZE = 25** (statt 50) – halbiert die pro Seite gerenderten Zeilen und reduziert Re-Render-Kosten. ResizeObserver-Instrumentierung entfernt (H6 verworfen).
