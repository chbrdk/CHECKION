# CHECKION – Feature-Ideen: GEO, LLM-Optimierung, Domain-Analyse & Free APIs

**Stand:** Februar 2026  
**Umgesetzt:** 2.1–2.7, 3.1–3.5, 1.1, 1.4, 1.6, 4 (Free APIs)  
**Kontext:** Erweiterungen zu bestehenden Scans – GEO, LLM-Fitness, Domain-Analyse, Nutzung freier Third-Party-APIs.

---

## Übersicht

| Kategorie        | Ideen                                                                 |
|------------------|-----------------------------------------------------------------------|
| **GEO / E-E-A-T** | 6 Vorschläge                                                         |
| **LLM-Optimierung** | 7 Vorschläge                                                       |
| **Domain-Analyse** | 5 Vorschläge                                                        |
| **Free 3rd Party APIs** | 6 APIs mit konkreten Use-Cases                                    |

---

## 1. GEO / E-E-A-T Erweiterungen

### 1.1 Geo-Targeting-Validierung (ip-api.com)

- **Status:** ip-api.com wird bereits für Geo-Lookup des Server-Standorts genutzt (lib/scanner.ts).
- **Erweiterung:** Nutzer kann „Zielregion“ eingeben (z.B. DE, EU). Wenn Server-Standort nicht zur Zielregion passt (z.B. Server in USA, Ziel DE), Hinweis: „Server-Standort weicht von Zielregion ab – ggf. CDN/Geo-Routing prüfen“.
- **Konfiguration:** Optional `GEO_TARGET_REGION`-Umgebungsvariable oder Scan-Parameter.

### 1.2 E-E-A-T: Autoritäts-Signale über externe APIs

- **Idee:** Domain-Authority/Trust-Signale über freie APIs anreichern.
- **APIs:** z.B. SSL Labs (SSL-Zertifikat, Vertrauen), Wayback Machine (Domain-Alter, Beständigkeit).
- **Output:** Zusätzliche Metrik „Domain Trust“ in E-E-A-T-Bewertung.

### 1.3 Mehrsprachige GEO/E-E-A-T Analyse

- **Bereits erwähnt:** `knowledge/checkion-improvement-opportunities.md` – hreflang, sprachspezifische E-E-A-T.
- **Umsetzung:** Bei Domain-Scan: sprachspezifische Aggregate (pro hreflang-Gruppe); LLM-Stufen optional pro Sprache.

### 1.4 YMYL-Seiten-Kennzeichnung

- **Idee:** Seiten typisieren (YMYL vs. Non-YMYL). YMYL = strengere E-E-A-T-Anforderungen bei Google.
- **Heuristik:** Keywords (Finanzen, Gesundheit, rechtliche Beratung etc.) oder URL-Pfad-Muster.
- **Output:** Badge „YMYL“/„Non-YMYL“ + Hinweis auf erhöhte E-E-A-T-Anforderungen.

### 1.5 Competitive Benchmark: Share of Voice über Zeit

- **Erweiterung:** Mehrere Competitive-Runs speichern, Trend: Wie entwickelt sich Share of Voice / Position über Zeit?

### 1.6 GEO-Score-Erklärung im UI

- **Quick Win:** Tooltip oder Infotext, wie der GEO-Score (0–100) berechnet wird (llms.txt, robots, Schema, FAQ, etc.) – Transparenz für Nutzer.

---

## 2. LLM-Optimierung

### 2.1 llms.txt-Spec-konform prüfen

- **Aktuell:** Scanner prüft llms.txt-Vorkommen und Sektionen (Description, Rules, Allow, Block, Sitemap, Contact, Policy).
- **Spec (llms-txt):** Erweiterung um Validierung nach [llms-txt Spec](https://github.com/answerdotai/llms-txt):
  - **Allow/Disallow/User-LLM/Attribution/License/Contact** – alle erkannten Direktiven anzeigen.
  - **Pflichtfelder:** Title (H1), Description (Blockquote), Sections (H2), Links mit Annotation.
  - **Optional:** Hinweis auf fehlende empfohlene Sections (z.B. Contact, License).

### 2.2 llms.txt-Generierung / Vorschlag

- **Idee:** Basierend auf Scan-Daten (Sitemap, robots, Schema-Typen) einen **Vorschlag für llms.txt** generieren (Markdown-Text zum Copy-Paste).
- **Output:** „llms.txt-Vorschlag“-Sektion im Generative-Tab mit Download/Copy-Button.

### 2.3 Structured Data für LLMs verbessern

- **Idee:** Zusätzlich zu Schema-Coverage: Empfehlungen für **speziell LLM-freundliche Schemas** (z.B. FAQPage, HowTo, Article mit author/datePublished).
- **Output:** „Fehlende empfohlene Schema-Typen“ bereits teilweise vorhanden – erweitern um LLM-spezifische Hinweise.

### 2.4 Citation-Dichte & Quellenangaben

- **Aktuell:** citationDensity, citationCount im Scanner.
- **Erweiterung:** Prüfung, ob Zitate verlinkt sind (href zu externen Quellen) – stärkeres E-E-A-T-Signal.
- **Heuristik:** `blockquote` + `cite`/`a[href^="http"]` in der Nähe.

### 2.5 Rules-Sektion in llms.txt parsen

- **Idee:** Wenn `Rules:` in llms.txt vorhanden, Inhalt parsen und in der UI anzeigen – Nutzer sieht, welche Regeln für LLMs definiert sind.

### 2.6 robots.txt vs. llms.txt Konsistenz

- **Idee:** Vergleichen: Was in robots.txt für AI-Bots (GPTBot, etc.) erlaubt/blockiert ist vs. was llms.txt Allow/Block angibt. Bei Widersprüchen Warnung anzeigen.

### 2.7 Markdown-Versionen prüfen

- **Spec:** llms.txt kann auf .md-Versionen von Seiten verweisen.
- **Idee:** Wenn in llms.txt Links zu `/page.md` o.ä. vorkommen, prüfen ob diese URLs erreichbar sind (HEAD-Request).

---

## 3. Domain-Analyse Erweiterungen

### 3.1 Tech-Stack-Erkennung (Wappalyzer / DetectZeStack)

- **Wappalyzer:** Open Source, npm-Paket `wappalyzer` – selbst hostbar, kein API-Key nötig.
- **Alternativ:** DetectZeStack (100 Requests/Monat kostenlos).
- **Integration:** Beim Domain-Scan oder Single-Scan: Tech-Stack (CMS, E-Commerce, Analytics) erfassen → neue Sektion „Technologie“ in Domain-Summary.
- **Nutzen:** Compliance (z.B. DSGVO-relevante Tools), Accessibility-Tipps pro CMS (WordPress, Drupal, etc.).

### 3.2 SSL/TLS-Sicherheit (SSL Labs API)

- **API:** [SSL Labs API](https://www.ssllabs.com/projects/ssllabs-apis/) – kostenlos, Rate-Limits beachten.
- **Endpoint:** `https://api.ssllabs.com/api/v3/analyze?host=example.com`
- **Output:** SSL-Grade (A–F), Zertifikat-Infos, Schwachstellen.
- **Integration:** Neuer Tab „Infrastruktur“ oder Erweiterung „Security“ in Domain-Scan; optional pro Single-Scan.

### 3.3 PageSpeed Insights API (Google)

- **API:** [PageSpeed Insights v5](https://developers.google.com/speed/docs/insights/v5/get-started) – kostenlos (mit API-Key empfohlen).
- **Output:** Performance, Accessibility, Best Practices, SEO – Lab + CrUX-Daten.
- **Integration:** Beim Scan optional Performance-Score hinzufügen; oder eigener „Performance-Scan“-Modus.
- **Hinweis:** Accessibility-Teil von PageSpeed überschneidet sich mit axe/htmlcs – kann als zweite Meinung oder für CrUX genutzt werden.

### 3.4 Domain-Alter & Beständigkeit (Wayback Machine)

- **API:** [archive.org/wayback/available](https://archive.org/help/wayback_api.php) – kostenlos.
- **Beispiel:** `https://archive.org/wayback/available?url=example.com`
- **Output:** Erste Erwähnung, Anzahl gesnapshotteter Versionen.
- **Nutzen:** E-E-A-T – ältere, beständige Domains können als vertrauenswürdiger gelten.

### 3.5 Cross-Page-Issue-Priorisierung

- **Idee:** Bei Domain-Aggregation: Issues, die auf **vielen** Seiten vorkommen, höher priorisieren („Fix einmal, wirkt überall“).
- **Output:** Sortierung/Filter „Nach Seitenanzahl“ in DomainAggregatedIssueList; Badge „betrifft N Seiten“.

### 3.6 Subdomain-Übersicht (optional)

- **Idee:** Wenn SecurityTrails oder ähnliche API (teils kostenlos) genutzt wird: bekannte Subdomains anzeigen.
- **Einschränkung:** SecurityTrails Free Tier sehr limitiert; ggf. nur als „experimentelles“ Feature.

---

## 4. Free 3rd Party APIs – Zusammenfassung

| API                   | Zweck                           | Kosten            | Integration-Idee                          |
|-----------------------|----------------------------------|-------------------|------------------------------------------|
| **ip-api.com**        | Geo-Lookup                      | Kostenlos*         | Bereits integriert (Server-Standort)     |
| **SSL Labs API**      | SSL/TLS-Grade, Zertifikate      | Kostenlos          | Neuer Security-Score in Infra/Scan       |
| **PageSpeed Insights**| Performance, A11y, SEO          | Kostenlos          | Performance-Tab oder CrUX-Daten          |
| **Wayback Machine**   | Domain-Alter, Beständigkeit     | Kostenlos          | E-E-A-T „Domain Trust“                   |
| **Wappalyzer (npm)**  | Tech-Stack-Erkennung            | Kostenlos (self-host) | Neue Sektion „Technologie“             |
| **DetectZeStack**     | Tech-Stack (Alternative)        | 100/Monat kostenlos | Fallback wenn Wappalyzer zu schwer      |

\* ip-api.com: Nur für nicht-kommerzielle Nutzung kostenlos; für Produktion ggf. [ip-api.com Pro](https://ip-api.com/docs) oder Alternative (z.B. ipinfo.io Free Tier).

---

## 5. Priorisierungsvorschlag

### Schnell umsetzbar (Quick Wins)

1. **GEO-Score-Erklärung** (2.6) – Tooltip/Infotext.
2. **llms.txt Rules parsen** (2.5) – Erweiterung des bestehenden Parsings.
3. **Cross-Page-Priorisierung** (3.5) – Sortierung nach Seitenanzahl.

### Mittlere Priorität

4. **SSL Labs API** (3.2) – Security-Score, guter Mehrwert.
5. **llms.txt-Spec-Validierung** (2.1) – Vollständigere Prüfung.
6. **Tech-Stack (Wappalyzer)** (3.1) – Starkes Differenzierungs-Feature.
7. **PageSpeed API** (3.3) – Performance-Daten, CrUX.

### Größere Features

8. **Wayback Machine** (3.4) – Domain Trust für E-E-A-T.
9. **llms.txt-Generierung** (2.2) – Praktischer Nutzen für Nutzer.
10. **Geo-Targeting-Validierung** (1.1) – Erweiterung der bestehenden Geo-Logik.

---

## 6. Zentrale API-URLs

**Alle externen API-Base-URLs sollten in `lib/constants.ts` oder einer separaten `lib/external-apis.ts` hinterlegt werden**, um Hardcoding zu vermeiden:

```ts
// Beispiel lib/constants.ts oder lib/external-apis.ts
export const API_IP_API_BASE = 'http://ip-api.com';
export const API_SSL_LABS_BASE = 'https://api.ssllabs.com/api/v3';
export const API_PAGESPEED_BASE = 'https://pagespeedonline.googleapis.com/pagespeedonline/v5';
export const API_WAYBACK_AVAILABLE = 'https://archive.org/wayback/available';
```

---

## Verweise

- `lib/constants.ts` – Zentrale Pfade und URLs
- `lib/scanner.ts` – Scan-Pipeline, generative, geo
- `knowledge/checkion-geo-eeat-intensive-scan.md` – GEO/E-E-A-T-Ablauf
- `knowledge/checkion-improvement-opportunities.md` – Verbesserungsplan
- `knowledge/checkion-eeat-analysis.md` – E-E-A-T-Signale
