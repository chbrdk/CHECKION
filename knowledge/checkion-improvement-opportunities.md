# CHECKION – Verbesserungsmöglichkeiten & neue Features

**Stand:** Analyse vom Projekt-Review.

---

## Projekt-Übersicht

| Kategorie | Metrik | Status |
|-----------|--------|--------|
| **Framework** | Next.js 16, React 19 | ✅ Aktuell |
| **Scan-Modi** | Single, Deep, Journey, GEO/E-E-A-T | ✅ 4 Modi |
| **API-Routen** | 44 Endpoints | ✅ Umfangreich |
| **i18n** | DE/EN, 526 Keys | ✅ Gut |
| **Tests** | 7 Unit-Tests (lib) | ⚠️ Lücken |
| **Knowledge** | 26 Dokumente | ✅ Ausgeprägt |
| **Sicherheit** | Auth, Hashing | ⚠️ Kein Rate Limit |

---

## Stärken

- Klare Struktur (app/lib/components), TypeScript, Knowledge-Base
- Caching mit Tag-basierter Invalidierung
- Code-Splitting für schwere Komponenten
- Mehrgeräte-Scans, Domain-Crawl, KI-Journey, GEO/E-E-A-T, Saliency-Fusion
- Share-Links mit Passwortschutz, PDF-Export
- WCAG-Scanning (axe-core + HTML_CodeSniffer), ARIA-, Fokus- und Touch-Target-Prüfung

---

## Verbesserungen

### Hohe Priorität

1. **Testabdeckung** – ~~API- und Komponententests; Start: kritische Scan- und Auth-Routen~~ ✅ API-Tests für Health, Auth-Register (Validierung), Scan (401, URL-Validierung) – Vitest + `npm run test`/`test:api`  
2. **`.env.example`** – Dokumentation aller Umgebungsvariablen  
3. **Rate Limiting** – Schutz der Scan-Endpoints (z. B. @upstash/ratelimit)  
4. **i18n-Audit** – ~~restliche hardcodierte Strings (z. B. Journey-Agent) in i18n überführen~~ ✅ Erledigt (Journey-Agent: Schritt X/Y, ARIA, Action-Labels; Domain: journeyNotFound, issuePagesCount, fixingRuleAffects)  

### Mittlere Priorität

5. **Fehlerbehandlung** – ~~zentrale Fehlerbehandlung/API-Handler~~ ✅ `lib/api-error-handler.ts` (apiError, handleApiError, API_STATUS); Scan + Auth-Register migriert  
6. **Input-Validierung** – ~~Zod-Schemas für API-Eingaben~~ ✅ `lib/api-schemas.ts` + parseApiBody; Scan, Auth, Domain, Journey, GEO, Saliency, Tools migriert  
7. **Passwort-Sicherheit** – Mindestanforderungen (Länge, Komplexität) ✅ `passwordSchema` in lib/api-schemas: min 8 Zeichen, je 1 Groß-/Kleinbuchstabe, 1 Ziffer; Register + Change-Password; i18n-Hinweise im UI  

### Niedrige Priorität

8. **ARIA-Labels** – Audit aller interaktiven Elemente ✅ HistoryList/SearchResultsList: role="button", tabIndex, aria-label, onKeyDown; BrandColorSelector/DomainAggregatedIssueList: aria-label; Delete- und Open-Buttons über i18n  
9. **TypeScript Strict** – `@ts-ignore`-Stellen beseitigen ✅ extract route, scanner (pa11y, axe, __cls_score), debug_ux_metrics – ersetzt durch Typ-Assertions / erweiterte Interface  
10. **URL/Path-Konstanten** – zentrale API-Routen-Konstanten ✅ `lib/constants.ts`: PATH_*, path*(), API_*, api*(); App/API-Routen migriert, Tests in `__tests__/lib/constants-paths.test.ts`  

---

## Neue Feature-Ideen

### 1. Accessibility-Score-Trend

- Scan-History pro Domain speichern, Trends anzeigen, Regressionen erkennen  
- Nutzen: Langfristiges Tracking von Barrierefreiheits-Verbesserungen  

### 2. Automatische Remediation-Vorschläge ✅ Phase 1

- Pro WCAG-Issue: Link zur Fix-Dokumentation (Deque University für axe, W3C für htmlcs)  
- `lib/remediation-urls.ts`, Issue.helpUrl, ScanIssueRow + DomainAggregatedIssueList  
- Nutzen: Schnellere Umsetzung von Fixes  
- Erweiterbar: LLM-generierte Fix-Anleitungen (Phase 2)

### 3. Mehrsprachige GEO/E-E-A-T Analyse

- hreflang, sprachspezifische Inhalte, E-E-A-T pro Sprache  
- Nutzen: Internationale SEO und Barrierefreiheit  

### 4. Weitere Feature-Ideen (GEO, LLM, Domain, Free APIs)

- Siehe **`knowledge/checkion-feature-ideas-geo-llm-domain.md`** – strukturierte Liste mit Priorisierung, inkl. SSL Labs, PageSpeed, Wappalyzer, Wayback Machine, llms.txt-Spec-Validierung, Tech-Stack, Geo-Targeting, etc.

### 5. Team-Kollaboration

- Kommentare zu Issues, Zuweisung, ggf. Live-Updates  
- Nutzen: Arbeit in Teams, Verantwortlichkeit  

### 6. Compliance-Report (PDF/CSV)

- WCAG ↔ Section 508 ↔ EN 301 549, Audit-Bericht, CSV-Export  
- Nutzen: Rechtssicherheit, Compliance-Audits  

---

## Verweise

- `knowledge/checkion-caching.md` – Caching-Strategie  
- `knowledge/checkion-geo-eeat-intensive-scan.md` – GEO/E-E-A-T  
- `lib/constants.ts` – Zentrale Konstanten  
