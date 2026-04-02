# UI-Virtualisierung: Kandidaten (Auswertung)

Ziel: Weniger DOM-Knoten bei sehr langen Listen. Bereits genutzt: `@tanstack/react-virtual` in `components/DomainIssuesMasterDetail.tsx` (alle drei Spalten: Gruppen, betroffene Seiten, Issues pro Seite) und in `components/ScanIssueList.tsx` (Ergebnisliste Einzelscan, inkl. `measureElement` + sticky Header).

## Bereits gut abgefedert (weniger dringend)

| Komponente / Bereich | Grund |
|----------------------|--------|
| `ScannedPagesTable.tsx` | **Pagination** (`DOMAIN_PAGES_TABLE_PAGE_SIZE`), rendert nur eine Seite Zeilen. |
| `DomainAggregatedIssueList.tsx` | Pagination + **`@tanstack/react-virtual`** für die aktuelle Seite (`DOMAIN_AGGREGATED_ISSUES_ROW_ESTIMATE_PX` in `lib/constants.ts`). Legacy-Tab „Liste & Details“; Master/Detail bleibt primär. |
| `GeoAnalysisPagesTable.tsx`, `SeoOnPageTable.tsx`, `SeoKeywordsTable.tsx` | Typisch begrenzte Zeilenzahl oder bereits **overflow + begrenzte Daten** pro Ansicht; bei extremen Domains ggf. nachziehen. |

## Hoher Nutzen bei großen Datenmengen

| Komponente / Datei | Risiko | Empfehlung |
|--------------------|--------|--------------|
| `ScanIssueList.tsx` | — | **Erledigt** (Virtualisierung + globaler Index über `issueIndexBase`; Jump aus Overlay wechselt bei Bedarf die Issue-Seite, siehe `resultsIssuesOneBasedPageForFilteredIndex`). |
| `app/results/[id]/page.tsx` | Große Tabellen/Scroll-Container für Scan-Ergebnisse. | Issue-Tabelle: via `ScanIssueList` abgedeckt; weitere Bereiche nur bei Bedarf. |
| `app/share/[token]/page.tsx` | Gescannte Seiten-Liste | Bereits **Pagination** (`SHARE_DOMAIN_PAGES_PAGE_SIZE`, z. B. 10/Zeile); Virtualisierung optional bei erhöhtem Page-Size. |
| `app/domain/[id]/page.tsx` | — | **Teilweise erledigt:** `VirtualScrollList` für systemische Issues, Focus-Order/Touch-Target-URLs, Struktur (H1/Level-Sprünge), SEO-Seitenliste, GEO/Generative-Seitenliste (`components/VirtualScrollList.tsx`, Tuning in `lib/constants.ts`). |

## Datenbank-„Tabellen“

Hier geht es nicht um React-Virtualisierung, sondern um **Indizes, Paginierung, keine vollen JSON-Payloads**:

- `domain_page_issues` / `domain_issue_groups` – bereits auf **paged APIs** ausgelegt.
- `scans.result` (JSONB) – große Objekte bei Einzelscans; **keine** vollständige Issues-Liste im Domain-Summary-Response.

## Domain-Seite: leichtes Summary + Tab-Mount

- **`GET /api/scan/domain/[id]/summary?light=1`** liefert ein schlankeres JSON (`toLightDomainSummaryApiPayload` in `lib/domain-summary.ts`): **`pages` leer**, **`aggregated.seo.pages` leer**, `summaryMeta.seoPageRowsOmitted` + **`slimPagesOmitted`**. Die **SlimPage-Liste** lädt die Domain-Seite per **`GET /api/scan/domain/[id]/slim-pages`** (DB: `domain_pages` + Join auf `scans` für Stats; Fallback: Slice aus `domain_scans.payload`). Tab **„Links & SEO“** (7) holt weiter die **volle** Summary ohne `light` für die SEO-Seitenliste.
- **Issues-Tab (Tab 2):** `DomainIssuesMasterDetail` wird nur gerendert, wenn `tabValue === 2` (kein `display:none` mehr), damit die schwere Master/Detail-UI nicht im Hintergrund bleibt. **Deep-Link:** Sind `group`, `page`, `itype`, `wcag` oder `q` in der Query, wechselt die Seite per `startTransition` auf Tab 2. Die drei Virtual-Listen nutzen **feste Zeilenhöhen** (ohne `measureElement`), um Layout-Schleifen bei langen Listen zu vermeiden.

## Kurzregel

- **Liste > ~100 sichtbare Zeilen** oder **tausende Einträge im Array** → Virtualisierung oder Server-Pagination.
- **Bereits paginiert** (z. B. 50er Pages) → oft ausreichend; Virtualisierung optional.
