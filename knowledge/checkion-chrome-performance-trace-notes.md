# Chrome Performance-Aufnahmen (Domain-Ergebnis)

## Auswertung Beispiel `Trace-*` (links-seo)

- Hohe **Main-Thread**-Anteile: **`RunTask`**, **`v8.callFunction`**, **`FunctionCall`** — typisch für erste Ausführung nach **Code-Split** (`next/dynamic`).
- Lange **`FunctionCall`**-Slices zeigen oft **`/_next/static/chunks/4bd1b696-*.js`** und **`9826-*.js`** (Framework/React-Bundle) sowie Route-/Tab-Chunks.
- **`links-seo`** taucht als Script-/Task-Kontext mit merklicher Gesamtzeit auf — dort wird der Tab-Chunk nachgeladen und gerendert.
- **`CpuProfiler::StartProfiling`** / **`V8.StackGuard`** ~100 ms: Aufnahme **mit** eingeschaltetem CPU-Profiler verzerrt die Baseline; für reine UX-Messung kurz ohne Profiler messen oder mehrere Samples mitteln.

## Mitigations im Code

- **`DomainTabChunksIdlePrefetch`** in `DomainResultMain.tsx`: nach geladenem Bundle per **`requestIdleCallback`** die Tab-**`import()`**s anstoßen (Links & SEO zuerst), damit Parse nicht erst beim ersten Tab-Klick anliegt.
- **`loading: TabChunkFallback`** auf allen dynamischen Tab-Sektionen, damit beim ersten Öffnen ein Spinner statt leerem Layout erscheint.
- Keyword-Chips: **`inlineThreshold`** für VirtualChipList (kein Virtual-Scroll bei ≤25 Einträgen), **`useDeferredValue`** für diesen Tab entfernt (Merge-Artefakte).
- **Virtualisierung:** Kein **`margin` unter virtuellen Zeilen** — `margin` fließt oft nicht in `measureElement` / Gesamthöhe ein → Zeilen „verschwinden“ beim Scrollen. Stattdessen TanStack-**`gap`** in `VirtualScrollList` und `DOMAIN_TAB_VIRTUAL_SCROLL_GAP_PX`; **`overflow-anchor: none`** am Scroll-Root; optional **`useAnimationFrameWithResizeObserver`**.
