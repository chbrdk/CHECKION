# Domain-Ergebnis: Tabs vs. eigenständige Seiten

## Problem

Die Domain-Ergebnis-UI (`app/domain/[id]/page.tsx`) bündelt viele Themen in **einer sehr großen Client-Page**: viele `useState`/`useEffect`-Ketten (u. a. Slim-Pages-Nachladen, SEO-Vollhydration für Tab „Links & SEO“), schwere Unterbäume (Graph, Issues Master-Detail, Virtual-Listen) und **MsqdxTabs** mit per `tabValue` geschaltetem Inhalt.

Auch wenn nur **ein** Tab-Inhalt gerendert wird, bleibt die **gesamte Komponente** geladen: Hook-Logik, Tab-Leiste und geparster Bundle-Umfang wirken auf jede Interaktion. Virtualisierte Listen (`VirtualScrollList`) reagieren zudem empfindlich auf **Höhen/Margins** zwischen Items — das kann Layout-Sprünge oder „kaputt“ wirkendes Scroll-Verhalten erzeugen, ohne dass es ein klassischer React-Crash ist.

## Macht eigenständige Seiten Sinn?

**Ja, mittel- bis langfristig sinnvoll**, wenn Stabilität und Wartbarkeit Priorität haben:

| Aspekt | Tabs (Status quo) | Echte Unterrouten z. B. `/domain/[id]/links-seo` |
|--------|-------------------|---------------------------------------------------|
| **DOM / JS pro Ansicht** | Eine Mega-Komponente, alle Effekte im selben Scope | Pro Route nur der jeweilige Baum; klarere Trennung |
| **Code-Splitting** | Nur wo `dynamic()` genutzt wird | Natürlich pro `page.tsx`-Chunk möglich |
| **Daten / API** | Zentral, bedingte Fetches (z. B. nur bei Tab 7 SEO-Full) | Pro Seite gezielte Loader oder gemeinsames **Layout + Context** |
| **URL / Teilen** | Ohne Query kaum bookmarkbar | Klare, teilbare URLs |
| **Aufwand** | Geringer | Höher: Layout, Provider für `DomainSummary`, Links überall anpassen |

## Pragmatische Zwischenstufen (ohne sofort 11 Routen)

1. **`view`-Query (oder `tab`) synchron halten** — z. B. `?view=links-seo` parallel zu `tabValue`, damit Deep-Links und Browser-History konsistent sind (bestehende Params wie `group`/`page` für Issues bleiben erhalten).
2. **Tab-Inhalte in eigene Dateien** extrahieren und per `next/dynamic` laden — weniger Initial-JS, klarere Tests.
3. **Virtual-Listen**: kein `margin` auf gemessenen Zeilen-Inhalten (Abstand über Wrapper/Padding im List-Container), damit `@tanstack/react-virtual` stabile Höhen misst.

## Empfehlung

- **Kurzfristig:** Rendering-Probleme bei Listen gezielt prüfen (Mess-Element, kein `margin-bottom` auf virtuellen Zeilen); optional `view`-Parameter.
- **Strukturell:** Schrittweise auf **`app/domain/[id]/layout.tsx`** (gemeinsamer Header, Laden des Scans) plus **Unterseiten** für die schwersten Bereiche (z. B. Links & SEO, Liste & Details, Journey) — nicht zwingend alle 11 Tabs auf einmal splitten.

## Umsetzung (Stand)

- **`DomainScanProvider`** (`context/DomainScanContext.tsx`): ein Fetch für Summary (light), Slim-Pages- und SEO-Full-Effekte abhängig von **`activeSection`** (aus `pathname` via `getDomainSectionFromPathname`).
- **Routing:** `app/domain/[id]/layout.tsx` + **`app/domain/[id]/[[...section]]/page.tsx`** — eine Client-Page rendert `DomainResultMain`; URLs z. B. `/domain/{id}/links-seo`, Übersicht bleibt `/domain/{id}`.
- **Navigation:** `DomainResultShell` — horizontale **Tabs** (`DomainResultNav`), max. Breite **`LAYOUT_MAX_CONTENT_WIDTH_PX`** (zentriert, gleiches Raster wie Results/Home), **sticky** Header-Karte mit Tab-Leiste beim Scrollen; Datumszeile locale-aware (`de-DE` / `en-US`); Pfade zentral **`pathDomainSection`** in `lib/domain-result-sections.ts`.
- **Issue-Deep-Links:** Query-Parameter bleiben erhalten; Navigation zu **`list-details`** inkl. Query über `pathDomainSection(id, 'list-details')?…`.
- **Journey:** Dashboard und Speichern nutzen **`pathDomainSection(id, 'journey', { restoreJourney })`**.
