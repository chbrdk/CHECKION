# Deep Scan Visual Map – Konzept und Implementierung

## Zweck

Die Visual Map im Domain-Ergebnis (Tab „Visual Map“) zeigt den Link-Graphen des Deep Scans: Knoten = gescannte Seiten, Kanten = Verlinkungen. Sie soll bei bis zu **~1000 Seiten** übersichtlich, **interaktiv und explorativ** sein und Verzweigungen/Relationen entdecken lassen (Zoom, Pan, Drag, Fokus, Filter, Suche).

## Konzept (State of the Art)

- **Rendering:** Canvas-basiert (react-force-graph-2d) für Performance; Force-directed Layout (d3-force) für natürliche Cluster und Verzweigungen.
- **Skalierung:** Gleiches Datenmodell `graph: { nodes, links }`; keine Backend-Änderung. Bei vielen Kanten: dünnere Linien, LOD (Level of Detail) in der Knotenzeichnung (kürzere Labels / kleinere Schrift bei Weitzoomen).
- **Interaktion:** Zoom (Mausrad + Buttons), Pan, Node-Drag; Klick auf Knoten = Fokus (nur Knoten + Nachbarn sichtbar); Filter (Score, Depth, Status); Suchfeld (URL/Title); Tooltip bei Hover.
- **Optional (Phase 2):** Clustering nach URL-Prefix, Minimap, Layout-Umschaltung Force vs. Hierarchie.

## Implementierung

| Bereich | Ort |
|--------|-----|
| Daten-Transformation | `lib/domain-graph-data.ts`: `domainGraphToForceData()`, `filterForceGraphData()`, `normalizeGraphId()`, `pathDepthFromUrl()` |
| Visual Map Komponente | `components/DomainGraph.tsx`: ForceGraph2D, Filterleiste, Zoom-Buttons, Tooltip, Fokus-Logik |
| Einbindung | `app/domain/[id]/page.tsx` (Tab value 1): `<DomainGraph data={result.graph} width={1200} height={800} />` |
| Optionaler Callback | `DomainGraph` unterstützt `onNodeClick?: (node: { url: string; id: string }) => void` (z.B. für Scroll zur Seite in der Listenansicht). |

## Datenfluss

- **Eingang:** `result.graph` (DomainSummaryResponse) mit `nodes[]` (id, url, score, depth, status, title) und `links[]` (source, target als URL-Strings).
- **Transform:** `domainGraphToForceData(data)` normalisiert IDs, setzt `val` für Knotengröße, verwirft Kanten zu nicht vorhandenen Knoten.
- **Filter:** `filterForceGraphData(data, { search, scoreMin/Max, depthMax, status })` reduziert Knoten und Kanten; die Komponente zeigt „X / Y nodes“ bei aktivem Filter.

## Tests

- **Unit-Tests** für Transform und Filter: `lib/domain-graph-data.test.ts`
- Ausführen: `npx tsx lib/domain-graph-data.test.ts`

## Abhängigkeit

- `react-force-graph-2d` (^1.29.1): Canvas, d3-force, Zoom/Pan/Drag, nodeCanvasObject für Score-Boxen und Labels.

## Siehe auch

- Plan: Deep Scan Visual Map Redesign (Konzept)
- `knowledge/checkion-deep-scan-sitemap.md` – Abschnitt „Visual Map (Link-Graph)“ für Datenherkunft (Spider, Kanten aus allLinks + Parent-Pfad).
