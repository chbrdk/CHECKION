# React Performance – CHECKION & @msqdx/react (Review Mai 2026)

Stand: 2026-05-03. Abgleich mit gängigen Empfehlungen (u. a. Vercel „React Best Practices“ Jan 2026, React Compiler, RSC, Web Vitals).

## CHECKION – bereits stark

- **Next 16 / React 19**, `experimental.optimizePackageImports` für `@mui/material` und `@msqdx/tokens`.
- **Code-Splitting**: viele `next/dynamic`-Imports (Ergebnis-Seite, Domain-Grafik, Journey, Tabellen).
- **Listen**: `@tanstack/react-virtual` (`VirtualScrollList`, issue lists mit geschätzten Zeilenhöhen).
- **Selektive Memoization**: `memo` auf Tabellen-/Scroll-Zeilen, `useMemo` für abgeleitete Graphen-/Chartdaten.
- **State**: `DomainScanContext` mit `useMemo`-Value; `startTransition` für Router-Updates bei Deep-Links.
- **Analyse**: `ANALYZE`-Bundle-Analyzer vorhanden.

## CHECKION – Umgesetzt (2026-05)

1. **React Compiler**: `reactCompiler: true` in `next.config.mjs`, Dev-Dependency `babel-plugin-react-compiler` (Next.js-Doku).
2. **DomainScanContext**: Aufgeteilt in **`useDomainScanCore()`** (Bundle, Tabs, Issues-URL, Projekt) und **`useDomainScanSession()`** (Journey + Summary-Lokalstate). Shell (`DomainResultShell`) und Tab-Orchestrator (`DomainResultMain`) nutzen nur **Core** → keine Re-Renders bei Journey-/Summary-State allein.
3. **Dashboard-Suche**: Nach Fetch/Clear werden Suchtreffer mit **`startTransition`** gesetzt (weniger Blockieren bei großen Ergebnislisten); Clear der Eingabe bleibt synchron.

## CHECKION – weiter sinnvoll

1. **`npm run analyze`**: Bundle bei Bedarf; Waterfalls in API-Routen separat prüfen (Vercel-Priorität 1).
2. **`useDeferredValue`**: Optional bei lokalem Live-Filter über große Listen (Issues haben bereits Debounce + URL).

## @msqdx/react (Design System)

- **Kein `React.memo`** in den Paket-Komponenten – mit React Compiler unkritisch; ohne Compiler bei sehr großen Trees (z. B. Board) Profiler nutzen.
- **Interaktion**: viel `useCallback` in Canvas/Connector-Komponenten (stabil für Event-Handler) – sinnvoll.
- **MarkdownContent** (`PrismionResult`): `ReactMarkdown`-Prop `components={{ ... }}` wird **pro Render neu erzeugt** – klassischer Hotspot; sollte **modul-level** oder `useMemo` sein.

## Externe Einordnung (Mitte 2026)

- Schwerpunkt: **Architektur** (RSC wo möglich, Streaming/Suspense, weniger JS auf dem Client), dann **Bundle**, dann **Re-Renders**.
- **Messung**: Produktionsbuild, React Profiler, Core Web Vitals (**LCP**, **INP**).
