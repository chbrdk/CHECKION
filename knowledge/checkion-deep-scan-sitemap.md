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

## Limits

- Weiterhin **MAX_PAGES** (100) für den Domain-Scan.
- Sitemap-Index: z. B. max. 5 Child-Sitemaps abrufen, dann aus allen bis zu MAX_PAGES URLs nehmen.
- Timeouts beim Abruf von robots.txt/sitemap.xml (z. B. 8s), bei Fehler/keine Sitemap: Fallback auf Link-Crawl.

## Testing

- Bei Einführung eines Test-Runners (Jest/Vitest): Unit-Tests für `lib/sitemap.ts` sinnvoll (z. B. `extractLocUrls`, `isSitemapIndex` mit festem XML-String; `getSitemapUrlFromRobots` / `fetchSitemapUrls` mit gemocktem `fetch`).
