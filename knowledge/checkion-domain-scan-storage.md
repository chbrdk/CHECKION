# Domain (Deep) Scan Storage – Refactor

## Übersicht

Beim Deep Scan werden **alle relevanten Metriken bereits während des Scans** berechnet und in **einem einzigen DB-Eintrag** (`domain_scans.payload`) gespeichert. Die einzelnen Seiten bleiben als Single-Scans in der Tabelle `scans` (mit `group_id` = Domain-Scan-ID) und sind über `/results/[id]` verlinkt.

## Gespeichertes Format (`domain_scans.payload`)

- **pages**: `SlimPage[]` – nur Referenzen: `id` (Scan-ID), `url`, `score`, `stats`, `ux?.score`. Kein `pageIndex`, keine Issues, kein Screenshot.
- **aggregated**: Vorberechnete Aggregationen (issues, ux, seo, links, infra, generative, structure, performance, eco).
- Wie bisher: `id`, `domain`, `timestamp`, `status`, `progress`, `totalPages`, `score`, `graph`, `systemicIssues`, `eeat`, `error`, `llmSummary`.

## URL-Normalisierung (http/https)

Damit der Spider (Sitemap, Link-Crawl) korrekt arbeitet, muss die Start-URL immer ein gültiges Schema haben. Ohne `http://` oder `https://` liefert der Scan oft deutlich weniger Seiten (z. B. nur ~200 statt 1000+).

- **`POST /api/scan/domain`**: `parsed.url` wird vor `startDomainScan` normalisiert: fehlt das Schema, wird `https://` vorangestellt.
- **`POST /api/projects/[id]/domain-scan-all`**: Eigenes Projekt-Domain wird vor dem Aufruf von `startDomainScan` mit `https://` versehen, wenn noch kein Schema gesetzt ist.

Siehe `app/api/scan/domain/route.ts` und `app/api/projects/[id]/domain-scan-all/route.ts`.

## Seitenthemen (Tags + Tier) – im Single Scan

Die LLM-Klassifikation (Tags + Tier 1–5) läuft **direkt im Single Scan** (`lib/scanner.ts`). Nach dem Aufbau des `ScanResult` wird `classifyPageWithLlm(result)` aufgerufen; bei Erfolg wird `pageClassification` ins Result geschrieben. Dadurch hat jede Seite (Einzelscan und Deep Scan) automatisch Tags und Tier, sofern genug `bodyTextExcerpt` vorhanden ist und `OPENAI_API_KEY` gesetzt ist. Siehe `lib/llm/page-classification.ts` (`classifyPageWithLlm`).

- Einzelscan: Result enthält `pageClassification` beim Speichern.
- Deep Scan: Jede von der Spider gescannte Seite wird klassifiziert; `toSlimPage` übernimmt `pageClassification` ins Domain-Payload.

## Ablauf Deep Scan

1. `POST /api/scan/domain` startet den Scan, erstellt einen leeren Domain-Eintrag.
2. Spider liefert am Ende `domainResult.pages` (volle `ScanResult[]`; jede Seite hat ggf. bereits `pageClassification`).
3. Pro Seite: `addScan(userId, { ...page, groupId: id })` – voller Scan in `scans`.
4. `buildStoredDomainPayload(fullPages, base)` berechnet Aggregationen und baut `pages: SlimPage[]` (inkl. `pageClassification`).
5. `updateDomainScan(id, userId, stored)` speichert den einen schlanken Payload.

## Lesen

- **Summary / Domain-Seite**: `getCachedDomainScan` → Payload enthält bereits `aggregated` und `pages` (slim). `buildDomainSummary(scan)` gibt bei neuem Format den Payload 1:1 zurück (Legacy: weiterhin Aggregation aus `scan.pages`).
- **Journey Agent**: Braucht volle `ScanResult[]` (pageIndex, allLinks, …). Wenn `hasStoredAggregated(scan)`: `listScansByGroupId(userId, domainId)` laden und `{ ...scan, pages: fullPages }` an den Agent übergeben.
- **Share (eine Seite)**: `getCachedScan(pageId, share.userId)` – Seite kommt aus `scans`, Domain-Payload nur zur Prüfung, ob `pageId` in `domain.pages` vorkommt.
- **Suche**: Bei Domain-Scans mit gespeichertem Aggregat: `listScansByGroupId(userId, ds.id)` und in den vollen Scans suchen.

## Rückwärtskompatibilität

- Alte Payloads ohne `aggregated` und mit `pages: ScanResult[]`: `buildDomainSummary` erkennt das (z. B. über `hasStoredAggregated` / `isFullPages`) und berechnet Aggregation wie bisher. Journey/Suche nutzen in dem Fall weiterhin `ds.pages` direkt.

## Typen

- `SlimPage`, `DomainScanResult` (mit `pages: SlimPage[] | ScanResult[]`, `aggregated?`) in `lib/types.ts`.
- `DomainScanResultWithFullPages`: für Journey/LLM, `pages: ScanResult[]`.
- `buildStoredDomainPayload`, `hasStoredAggregated`, `buildDomainSummary` in `lib/domain-summary.ts`.

## Siehe auch

- `lib/db/scans.ts`: `listScansByGroupId(userId, groupId)`.
- `app/api/scan/domain/route.ts`: Speicherlogik nach Scan-Ende.
- `knowledge/checkion-caching.md`: Cache-Tags für Domain-Scans.
