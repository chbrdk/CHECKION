# Deep Scan + Sitemap

## Idee

Beim **Deep Scan (Domain-Scan)** zusätzlich eine **Sitemap-Option**: Wir erkennen automatisch eine Sitemap (robots.txt oder Standard-URL) und nutzen, falls vorhanden, deren URLs als Scan-Liste statt nur Link-Crawl.

## Vorteile

- **Sitemap** = vom Betreiber gewünschte, indexierbare Seiten → oft vollständiger als reiner Link-Crawl.
- **Orphan-Seiten** werden erfasst (in Sitemap, aber nicht verlinkt).
- **Vorhersehbare Menge** (bis Limit), weniger Zufall durch Crawl-Tiefe.
- **Bereits vorhanden:** Sitemap-URL wird im Single-Page-Scan aus robots.txt/llms.txt ermittelt (SEO-Audit); gleiche Logik für Domain-Scan nutzbar.

## Ablauf

1. **Deep Scan starten** (Start-URL wie bisher).
2. **Sitemap ermitteln:**  
   - `GET {origin}/robots.txt` → Zeile `Sitemap: <url>` (erste oder alle).  
   - Fallback: `{origin}/sitemap.xml` oder `{origin}/sitemap_index.xml` probieren.
3. **Sitemap-XML laden:**  
   - Wenn **Sitemap-Index** (`<sitemap><loc>...</loc></sitemap>`): bis zu N Index-Einträge folgen, daraus `<url><loc>...</loc></url>` sammeln.  
   - Wenn **URL-Set** (`<url><loc>...</loc></url>`): URLs direkt auslesen.  
   - Nur URLs mit gleichem **Origin** behalten, max. **MAX_PAGES** (z. B. 25).
4. **Queue befüllen:**  
   - Wenn Sitemap-URLs gefunden: Queue = diese URLs (+ Start-URL falls nicht enthalten). Beim Scan **keine** weiteren Links aus Seiten in die Queue (reine Sitemap-Liste).  
   - Wenn **keine** Sitemap: bisheriges Verhalten (BFS von Start-URL, Links folgen).
5. **Option:** API-Parameter `useSitemap: true` (Default) / `false` → Sitemap-Nutzung an/aus.

## Technik

- **Neues Modul:** `lib/sitemap.ts`  
  - `getSitemapUrlFromRobots(origin)` → eine Sitemap-URL oder null.  
  - `fetchSitemapUrls(sitemapUrl, origin, maxUrls)` → Liste von URLs (XML parsen, ggf. Index folgen, gleicher Origin, Limit).
- **Spider** (`lib/spider.ts`): Zu Beginn optional Sitemap-URLs holen; bei Erfolg Queue mit diesen URLs seeden und Link-Extraktion im Scan-Loop deaktivieren („Sitemap-Modus“).
- **API** `POST /api/scan/domain`: Body optional `{ "url": "...", "useSitemap": true }`.

## Parallelisierung

- Domain-Scan führt bis zu **N Seiten gleichzeitig** aus (statt strikt nacheinander).
- **Concurrency:** `DOMAIN_SCAN_CONCURRENCY` (Default 4, max 8). Env: `DOMAIN_SCAN_CONCURRENCY=6`.
- Implementierung: Worker-Pool in `lib/spider.ts` – Queue wird abgearbeitet, bis zu N `runScan`-Promises laufen parallel; sobald einer fertig ist, wird der nächste URL aus der Queue gestartet.

## Limits

- **Max. Seiten konfigurierbar:** `DomainScanOptions.maxPages` (Default 100, Cap 5000). UI: Select auf der Deep-Scan-Startseite (`/scan/domain`) mit 50, 100, 250, 500, 1000, „Alle (5000)“. API: `POST /api/scan/domain` Body `{ "url": "...", "maxPages": 250 }`.
- Sitemap-Index: max. 5 Child-Sitemaps, dann aus allen bis zu `maxPages` URLs.
- Timeouts beim Abruf von robots.txt/sitemap.xml (z. B. 8s), bei Fehler/keine Sitemap: Fallback auf Link-Crawl.

## Visual Map (Link-Graph)

- **Graph:** Knoten = gescannte Seiten, Kanten = Verlinkung („Seite A verlinkt auf Seite B“).
- **Kanten-Quellen:** (1) Beim Link-Crawl: entdeckte Links (A → B beim Queuen). (2) **Nach dem Scan:** Für jede gescannte Seite werden `result.allLinks` ausgewertet; jede Ziel-URL, die ebenfalls ein gescanntes Node ist, ergibt eine Kante `source → target`. So zeigt die Visual Map alle Link-Beziehungen zwischen den indexierten Seiten („riesiges Diagramm mit vielen Linien“).
- DomainGraph: Bei vielen Kanten (>80) dünnere Linien und reduzierte Opazität für bessere Lesbarkeit.

## Testing

- Bei Einführung eines Test-Runners (Jest/Vitest): Unit-Tests für `lib/sitemap.ts` sinnvoll (z. B. `extractLocUrls`, `isSitemapIndex` mit festem XML-String; `getSitemapUrlFromRobots` / `fetchSitemapUrls` mit gemocktem `fetch`).
