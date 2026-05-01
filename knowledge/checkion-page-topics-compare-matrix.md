# Seitenthemen-Vergleich: gemeinsame Matrix

- **Route:** `/projects/[id]/page-topics`
- **Komponente:** `PageTopicsCompareBubbleMatrix` — eine Recharts-Scatter-Matrix aus **eigenem Scan + allen Konkurrenten** mit abgeschlossenem Deep Scan und Themen-Daten (`compareTopicSources.length >= 2`).
- **Datenaufbereitung:** `buildCombinedCompareBubblePoints` in `lib/page-topics-viz.ts` — pro Quelle zunächst Top-Themen (`PAGE_TOPICS_COMPARE_PER_SOURCE`), dann global nach Score sortiert und auf `PAGE_TOPICS_COMPARE_MAX_TOTAL` gekappt.
- **Kodierung:** Füllfarbe = `pageTopicTierColorCss(maxTier)` (wie Einzeldiagramm), **Randfarbe** = Quelle (`PAGE_TOPICS_COMPARE_SERIES_STROKE` / `pageTopicsCompareSeriesStrokeColor`).
- **Interaktion:** Klick **Legende** → nur diese Quelle (andere stark abblenden). Klick **Blase** → `baseTagKey` fokussieren, gestrichelte **Polyline** zwischen allen Punkten mit gleichem `baseTagKey` (Pixelkoordinaten aus dem Scatter-`shape`). Modi schließen sich aus (Legende löscht Themenfokus und umgekehrt). Button „Auswahl aufheben“.
- **i18n:** `projects.pageTopicsCombinedDiagram*`, `projects.pageTopicsCompare*`, `info.pageTopicsCompareMatrix`.
- **React:** In `app/projects/[id]/page-topics/page.tsx` alle Hooks (inkl. `useMemo` für `compareTopicSources`) **vor** frühen Returns (`!id`, `loading`) ausführen — sonst prod **#310** („Rendered more hooks than during the previous render“), wenn zuerst Loading und danach Content gerendert wird.
