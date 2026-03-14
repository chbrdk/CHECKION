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

- **H1 (exzessive Re-Renders):** Verworfen. SEO-Seite nur 2 Renders (ohne/mit Daten), Tabelle 1 Render. Kein Runaway.
- **H2 (Viewport löst Re-Renders aus):** Unklar; Viewport-Event einmal, kein setState im Observer.
- **Folgerung:** Slowness/Überlagerung kommen in der erfassten Session nicht von Re-Render-Stürmen. Maßnahmen: eigener Stacking Context für die Tabelle (`isolation: isolate` am Wrapper + an der Sticky-Header-Zeile), `zIndex: 2` für den Sticky-Header, damit er sauber über dem Body bleibt und nichts überdeckt wird.
