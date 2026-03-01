# GEO / E-E-A-T Intensivanalyse + Competitive LLM Benchmark

## Übersicht

Die **GEO / E-E-A-T Intensivanalyse** ist ein eigenständiger vierter Scan-Modus neben Single Page Scan, Deep Domain Scan und UX Journey Agent. Sie kombiniert:

- **Teil A:** Mehrstufige On-Page-Bewertung (technische Erfassung + LLM-Stufen für E-E-A-T, GEO-Fitness und Empfehlungen).
- **Teil B (optional):** **Competitive LLM Citation Benchmark** – wie gut die eigene Domain in LLM-Antworten im Vergleich zur Konkurrenz dasteht (Share of Voice, Position).

Recherche-Stand 2025/2026: GEO zielt auf Zitation in KI-Antworten; E-E-A-T wird für KI-generierte Inhalte strenger; Competitive Visibility wird über „Share of Model“ und Position in Antworten gemessen.

---

## Ablauf (Stufen)

1. **Stufe 1 – Technische Erfassung:** Einmaliger Page-Scan (wie Single Scan), Auswertung von `generative`, `eeatSignals`, `seo`, `privacy`, `bodyTextExcerpt`. Ergebnis: `GeoEeatIntensiveResult.pages[]` mit Rohdaten pro Seite.
2. **Stufe 2 – E-E-A-T (LLM):** Pro Seite: Bewertung Trust, Experience, Expertise, optional Authoritativeness (1–5 + Begründung). Output: `eeatScores` pro Seite.
3. **Stufe 3 – GEO-Fitness (LLM):** Pro Seite: Bewertung „Wie gut für Generative Search?“ (0–100), Begründung, fehlende Elemente.
4. **Stufe 4 – Empfehlungen (LLM):** Ein Aufruf über alle Seiten: Top 3–5 priorisierte Handlungsempfehlungen.
5. **Stufe 5 (optional) – Competitive Benchmark:** Wenn `runCompetitive` und Queries/Konkurrenz angegeben: Queries an LLM senden, Antworten parsen, Citations extrahieren, Metriken (Share of Voice, Ø-Position) pro Domain berechnen.

---

## Datenmodell

- **Tabelle:** `geo_eeat_runs` (id, user_id, url, domain_scan_id, status, payload, error, created_at, updated_at).
- **Payload:** `GeoEeatIntensiveResult`: `pages[]` (GeoEeatPageResult), `recommendations[]`, `aggregated?`, `competitive?` (CompetitiveBenchmarkResult).
- **Typen:** Siehe `lib/types.ts` (EeatLlmScores, GeoEeatPageResult, GeoEeatRecommendation, CompetitiveCitationRun, CompetitiveMetrics, CompetitiveBenchmarkResult).

---

## KI-Vorschläge für Konkurrenten & Fragen

Im ersten Schritt (Scan-Formular) kann der Nutzer Konkurrenten und Suchanfragen per KI vorschlagen lassen:

- **Button:** „Mit KI Konkurrenten & Fragen vorschlagen“ (sichtbar, wenn Competitive Benchmark aktiv und URL gesetzt).
- **API:** **POST /api/scan/geo-eeat/suggest-competitors-queries**  
  Body: `{ url }`. Antwort: `{ competitors: string[], queries: string[] }`.  
  Nutzt dieselbe OpenAI-Konfiguration wie die GEO/E-E-A-T-Stufen; bei fehlendem API-Key: 503.
- **Logik:** `lib/geo-eeat/suggest-parse.ts` – `extractHostname`, `parseSuggestResponse` (JSON aus LLM-Antwort extrahieren, Arrays begrenzen). Tests: `lib/geo-eeat/suggest-parse.test.ts`.

---

## API

- **POST /api/scan/geo-eeat**  
  Body: `{ url, domainScanId?, runCompetitive?, competitors?, queries? }`.  
  Legt Job an, startet Stufe 1 im Hintergrund, danach Stufen 2–4 (LLM) und optional Competitive.  
  Response: `202 { success: true, jobId }`.

- **GET /api/scan/geo-eeat/[jobId]**  
  Liefert Run inkl. Status und bei `complete` vollem Payload. Auth: nur eigene Runs.

- **GET /api/scan/geo-eeat/[jobId]/status**  
  Leichtes Polling: nur status, error.

- **GET /api/scan/geo-eeat/history**  
  Liste der Runs (limit über Query).

---

## Konfiguration

- **OPENAI_API_KEY:** Für Stufen 2–4 und Competitive (Citation-Extraktion). Wenn nicht gesetzt, werden LLM-Stufen übersprungen bzw. Competitive liefert leeres Ergebnis.
- **ANTHROPIC_API_KEY** (optional): Für zusätzliche Claude-Modelle im SoV-Benchmark.
- **GEMINI_API_KEY** (optional): Für zusätzliche Gemini-Modelle im SoV-Benchmark (Stand 01.03.2026: gemini-2.5-flash, gemini-2.5-pro, gemini-2.5-flash-lite, gemini-3-flash-preview, gemini-3.1-pro-preview).
- **GEO_EEAT_SERVICE_URL** (optional): Für zukünftigen externen Service; aktuell läuft alles in Next.js.

---

## UI

- **Scan-Seite:** Vierter Tab „GEO / E-E-A-T“, URL-Pflicht, optional Competitive (Checkbox + Competitors/Queries, je eine pro Zeile). Submit → Redirect zu `/geo-eeat/[jobId]`.
- **Ergebnis-Seite:** `/geo-eeat/[jobId]` – Status-Polling, bei Complete: On-Page (E-E-A-T + GEO), Empfehlungen, Competitive-Benchmark. Share-Button nutzt `SharePanel` mit `resourceType="geo_eeat"`.

---

## Share & Export

- **Share:** Resource-Typ `geo_eeat` in `lib/db/shares.ts`, POST/GET Share-API und Share-Landingpage unterstützen GEO/E-E-A-T-Runs. Share-URL zeigt vereinfachte Ansicht (Seiten, Empfehlungen, Competitive-Metriken).
- **PDF-Export:** Optional, derzeit nicht umgesetzt (analog zu ScanReportDocument).

---

## Verweise

- **E-E-A-T im Projekt:** `knowledge/checkion-eeat-analysis.md` – bestehende E-E-A-T-Signale im Scanner und Deep Scan; die Intensivanalyse erweitert das um LLM-Bewertung und Competitive.
- **Domain-Scan:** `lib/spider.ts`, `lib/domain-aggregation.ts` – E-E-A-T-Aggregation; bei Domain-Anbindung (Phase 2) kann ein bestehender Deep Scan als Eingabe für die Intensivanalyse genutzt werden.
