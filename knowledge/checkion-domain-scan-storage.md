# Domain (Deep) Scan Storage – Refactor

## Übersicht

Beim Deep Scan werden **alle relevanten Metriken bereits während des Scans** berechnet und in **einem einzigen DB-Eintrag** (`domain_scans.payload`) gespeichert. Die einzelnen Seiten bleiben als Single-Scans in der Tabelle `scans` (mit `group_id` = Domain-Scan-ID) und sind über `/results/[id]` verlinkt.

## Gespeichertes Format (`domain_scans.payload`)

- **pages**: `SlimPage[]` **oder** nach erfolgreichem Schreiben von **`domain_pages`** (Issues-Pipeline) **`[]`**. Die Seitenliste ist dann nur noch über `GET .../slim-pages` (DB-first) bzw. `domain_pages` verfügbar; **`totalPages`** bleibt im Payload für Zähler und `buildDomainSummary`.
- **aggregated**: Vorberechnete Aggregationen, **URL-lastige Arrays gekappt** (`toStoredAggregated`, Konstanten `DOMAIN_STORED_SUMMARY_*` in `lib/constants.ts` — zunächst gleich den Light-Summary-Caps, separat tunbar). Volle Detaillisten: `scans` + Domain-APIs.
- Wie bisher: `id`, `domain`, `timestamp`, `status`, `progress`, `totalPages`, `score`, `graph`, `systemicIssues`, `eeat`, `error`, `llmSummary`.

## URL-Normalisierung (http/https)

Damit der Spider (Sitemap, Link-Crawl) korrekt arbeitet, muss die Start-URL immer ein gültiges Schema haben. Ohne `http://` oder `https://` liefert der Scan oft deutlich weniger Seiten (z. B. nur ~200 statt 1000+).

- **`POST /api/scan/domain`**: `parsed.url` wird vor `startDomainScan` normalisiert: fehlt das Schema, wird `https://` vorangestellt.
- **`POST /api/projects/[id]/domain-scan-all`**: Eigenes Projekt-Domain wird vor dem Aufruf von `startDomainScan` mit `https://` versehen, wenn noch kein Schema gesetzt ist.

Siehe `app/api/scan/domain/route.ts` und `app/api/projects/[id]/domain-scan-all/route.ts`.

## Seitenthemen (Tags + Tier) – im Single Scan

Die LLM-Klassifikation (Tags + Tier 1–5) läuft **direkt im Single Scan** (`lib/scanner.ts`). Nach dem Aufbau des `ScanResult` wird `classifyPageWithLlm(result)` aufgerufen; bei Erfolg wird `pageClassification` ins Result geschrieben. Dadurch hat jede Seite (Einzelscan und Deep Scan) automatisch Tags und Tier, sofern genug `bodyTextExcerpt` vorhanden ist und **`ANTHROPIC_API_KEY`** gesetzt ist. Siehe `lib/llm/page-classification.ts` (`classifyPageWithLlm`). Nutzung wird bei gesetztem `userId` im Lauf als **`llm_request`** an PLEXON gemeldet (`page_classify_inline:{scanId}`).

- Einzelscan: Result enthält `pageClassification` beim Speichern.
- Deep Scan: Jede von der Spider gescannte Seite wird klassifiziert; `toSlimPage` übernimmt `pageClassification` ins Domain-Payload.

## Aggregierte Seitenthemen (`aggregated.pageClassification`)

Nach dem Deep Scan (und bei Legacy-Neuberechnung über `buildDomainSummary`) liegt unter `aggregated.pageClassification` eine **deterministische Domain-Rollup** aus allen Seiten mit mindestens einem `pageClassification.tagTiers`-Eintrag. Es gibt **kein zweites LLM** – nur Statistik über die bereits gespeicherten Tags/Tiers.

- **Fehlende / alte Payloads**: Ältere `domain_scans`-Einträge ohne diesen Block haben kein `pageClassification`; die UI blendet die Karte aus. Nach erneutem Scan oder Summary-Rebuild erscheint der Block, sobald Seiten klassifiziert sind.

### Felder (Kurz)

| Bereich | Bedeutung |
|--------|-----------|
| `coverage` | `totalPages` (alle gescannten Seiten), `pagesWithClassification` (Seiten mit nicht-leerem `tagTiers`). |
| `topThemes` | Zusammengeführte Tags nach `normalizePageTopicTagKey` (trim, lowercase, Leerzeichen). **Score** = Summe von **Tier²** pro Vorkommen; typische Nav-/Footer-Begriffe (siehe `PAGE_TOPIC_BOILERPLATE_KEYS` in `lib/domain-aggregation.ts`) werden mit **×0,25** gewichtet, damit echte Inhaltsthemen oben stehen. `pageCount` = Anzahl Seiten mit diesem Tag; `maxTier` / `avgTier` aus den Vorkommen. |
| `tierDistribution.avgTagsPerPageByTier` | Durchschnittliche Tag-Anzahl je Tier **pro Seite der gesamten Site** (Nenner = `totalPages`), damit fehlende Klassifikation die Mittelwerte „verdünnt“. |
| `tierDistribution.pagesWithAtLeastOneTier5` | Seiten mit mindestens einem T5-Tag. |
| `tierDistribution.pagesDominatedByLowTiers` | Seiten, auf denen die Summe der T1- und T2-Tags größer ist als die Summe der T4- und T5-Tags — heuristisch boilerplate-lastig; T3 fließt nicht ein. UI: `domainResult.pageTopicsLowTierDominant`, `info.pageTopicsLowTierDominant` in `locales/de.json` / `en.json`. |
| `pageSamples` | Pro klassifizierter Seite: `url`, `profile` (`pillar` / `hub` / `utility` / `mixed`), `tier5Count`, `lowTierCount` – für schnelle Übersicht; Länge wird beim Speichern/API gekappt. |

### Caps (Payload-Größe)

Wie bei anderen Aggregaten begrenzen `toStoredAggregated` und `toLightAggregated` die Arrays:

- `DOMAIN_LIGHT_SUMMARY_PAGE_CLASSIFICATION_TOP_THEMES_CAP` / `DOMAIN_STORED_SUMMARY_PAGE_CLASSIFICATION_TOP_THEMES_CAP` für `topThemes`.
- `DOMAIN_LIGHT_SUMMARY_PAGE_CLASSIFICATION_PAGE_SAMPLES_CAP` / `DOMAIN_STORED_SUMMARY_PAGE_CLASSIFICATION_PAGE_SAMPLES_CAP` für `pageSamples`.

Implementierung: `aggregatePageClassification` in `lib/domain-aggregation.ts`, Einbindung und Slicing in `lib/domain-summary.ts` (`capAggregatedForSize`).

## Unveränderte Seiten überspringen (optional)

- **`skipUnchangedPages: true`** im Body von `POST /api/scan/domain` oder Query `?skipUnchangedPages=true` bei **`POST /api/projects/[id]/domain-scan-all`**.
- Vor dem Puppeteer-Lauf: HEAD-Request; wenn **ETag** oder **Last-Modified** mit dem letzten gespeicherten Scan (`documentCacheHints` im `ScanResult`) übereinstimmt, wird das vorherige Ergebnis mit neuer `id` / `groupId` geklont (**kein** erneuter WCAG-/LLM-Lauf für diese URL).
- Grenzen: Viele Sites senden keine stabilen Header → dann voller Scan. Risiko falscher „unchanged“ bei dynamischen Seiten mit statischem ETag (selten).

## Domain-Scan-ID und Projekt

- `runDomainScan` erhält **`domainScanId`** = Zeilen-`id` aus `domain_scans` (gleiche ID im Payload wie in der DB).
- Nach Abschluss: `addScan(..., { projectId })` setzt `project_id` wie beim Domain-Scan (inkl. `null`), damit Reuse-Lookups pro Projekt stimmen.

## Ablauf Deep Scan

1. `POST /api/scan/domain` startet den Scan, erstellt einen leeren Domain-Eintrag.
2. Spider liefert am Ende `domainResult.pages` (volle `ScanResult[]`; jede Seite hat ggf. bereits `pageClassification` oder bei Reuse geklonte Daten).
3. Pro Seite: `addScan(userId, { ...page, groupId: id }, { projectId })` – voller Scan in `scans`.
4. `rebuildDomainIssuesFromPages` schreibt `domain_pages` / Issues-Tabellen (bei Fehler: Fallback mit `pages: SlimPage[]` im Payload).
5. `buildStoredDomainPayload(fullPages, base, { omitSlimPages })` — gekapptes `aggregated`; `omitSlimPages: true`, wenn Schritt 4 geklappt hat.
6. `updateDomainScan(id, userId, stored)` speichert den Payload einmal.

## Lesen

- **Summary / Domain-Seite**: `getCachedDomainScan` → Payload enthält bereits `aggregated` und `pages` (slim). `buildDomainSummary(scan)` gibt bei neuem Format den Payload 1:1 zurück (Legacy: weiterhin Aggregation aus `scan.pages`).
- **Journey Agent**: Braucht volle `ScanResult[]` (pageIndex, allLinks, …). Wenn `hasStoredAggregated(scan)`: `listScansByGroupId(userId, domainId)` laden und `{ ...scan, pages: fullPages }` an den Agent übergeben.
- **Share (eine Seite)**: `getCachedScan(pageId, share.userId)` – Seite kommt aus `scans`. Zugehörigkeit zum Domain-Scan: `isSharedDomainPageAllowed` in `lib/share-access.ts` — `pageId` in `domain.pages` **oder** `scan.groupId === domain.id` (falls `pages` im Payload leer ist).
- **Suche**: `listDomainScanSummariesForSearch` (kein voller JSONB-Payload) + Flag `hasStoredAggregated` aus `(payload->'aggregated') IS NOT NULL`; bei Domain-Scans mit Aggregat: `listScansByGroupId(userId, id)`; bei Legacy: `getDomainScan` und `pages` aus Payload.

## Domain-Ergebnis-UI: Bundle + paginierte Listen (2026)

Für die **Domain-Ergebnisseite** (`/domain/[id]`) gilt ein klarer Lese-Pfad ohne große Arrays im ersten Response:

- **`GET /api/scan/domain/[id]/bundle`** (`lib/domain-bundle.ts` → `buildDomainBundleForUser`): ein Request mit **Light-Aggregaten** (`toLightDomainSummaryApiPayload`), **`pages: []`**, **`summaryMeta`** mit `slimPagesOmitted` / `seoPageRowsOmitted`, plus **`totalSlimRows`** (Zählung aus `domain_pages` oder Payload) und **`projectId`**. Die React-App lädt dieses Bundle per TanStack Query; Tab-spezifische große Listen kommen aus eigenen Endpoints.
- **`GET .../slim-pages?offset=&limit=&sort=&dir=`**: DB-first (`listSlimPagesFromDomainPagesTable`) oder Payload-Slice (`sliceSlimPagesFromPayload`); Sortierung **`url` | `score` | `uxScore` | `issues`**. Konstanten: `DOMAIN_SLIM_PAGES_PAGE_SIZE`, Builder `apiScanDomainSlimPages` in `lib/constants.ts`.
- **`GET .../seo-pages?offset=&limit=&sort=&dir=`**: paginierte **`PageSeoSummary`**-Zeilen (`listSeoPageRowsFromDb` oder `sliceSeoPagesFromPayload`); Sort **`url` | `wordCount`**. Konstante **`DOMAIN_SEO_PAGES_PAGE_SIZE`**.
- **`GET .../page-resolve?url=`**: löst eine Domain-URL zu einer **`scanId`** auf (DB zuerst, sonst Payload), damit Links aus Aggregationen ohne vorgehaltene `SlimPage[]` funktionieren. Builder: `apiScanDomainPageResolve`.

Legacy **`GET .../summary?light=1`** bleibt für andere Clients nutzbar; die eingebettete App bevorzugt **`/bundle`**.

## Rückwärtskompatibilität

- Alte Payloads ohne `aggregated` und mit `pages: ScanResult[]`: `buildDomainSummary` erkennt das (z. B. über `hasStoredAggregated` / `isFullPages`) und berechnet Aggregation wie bisher. Journey/Suche nutzen in dem Fall weiterhin `ds.pages` direkt.

## Typen

- `SlimPage`, `DomainScanResult` (mit `pages: SlimPage[] | ScanResult[]`, `aggregated?`) in `lib/types.ts`.
- `DomainScanResultWithFullPages`: für Journey/LLM, `pages: ScanResult[]`.
- `buildStoredDomainPayload`, `toStoredAggregated`, `hasStoredAggregated`, `buildDomainSummary` in `lib/domain-summary.ts`.
- `listDomainScanSummariesForSearch` in `lib/db/scans.ts` (Such- und Listenpfade ohne vollen `payload`).

## Siehe auch

- `lib/db/scans.ts`: `listScansByGroupId(userId, groupId)`.
- `app/api/scan/domain/route.ts`: Speicherlogik nach Scan-Ende.
- `knowledge/checkion-caching.md`: Cache-Tags für Domain-Scans.
