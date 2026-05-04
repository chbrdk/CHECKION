# CHECKION – Funktionen, Use Cases und Nutzerwert (Stand: Codebase CHECKION)

---

## Für Stakeholder: Was CHECKION für die Organisation löst

**CHECKION** beantwortet eine Frage, die nach außen oft unsichtbar bleibt: **Wo stehen wir heute mit unserem Webauftritt – inhaltlich, technisch, barrierefrei und in einer Welt, in der KI Antworten über uns formuliert?**  

Das ist bewusst **mehr als ein einmaliges Audit**. Organisationen, die digital verkaufen, informieren oder reguliert nachweisen müssen, brauchen **wiederkehrende Orientierung**: nach jedem Release, nach Content-Updates, wenn Wettbewerber nachziehen oder sich die Anforderungen an **KI-Sichtbarkeit (GEO)** verschieben. CHECKION unterstützt genau diesen **Betriebsmodus** – Messpunkte lassen sich **in bestehende Abläufe einhängen** (z. B. Entwicklungsrhythmus, Qualitätssicherung, Agenten-Workflows), sodass Qualität **nicht nur vor dem Go-Live**, sondern **laufend** belegbar bleibt. Sie müssen intern keine neue „Insel-Software“ etablieren: **Dieselbe Plattform**, die Teams im Browser nutzen, kann **Teil der bestehenden Infrastruktur** werden – ohne dass Nutzer:innen die technische Ausgestaltung kennen müssen. Entscheidend ist das **Ergebnis**: weniger Überraschungen in Live, **klarere Prioritäten** im Backlog, **eine gemeinsame Evidenzbasis** für Marketing, Produkt, IT und Compliance.

**Kurz in drei Nutzenversprechen**

1. **Evidenz statt Bauchgefühl** – Barrierefreiheit, Site-weite Muster, GEO- und Wettbewerbslage werden **mess- und vergleichbar**.  
2. **Kontinuität statt Stichtag** – Von „wir haben mal gescannt“ zu **„wir wissen regelmäßig, ob wir zurückgefallen sind“** – inklusive Nachvollziehbarkeit für Gremien und Partner.  
3. **Einheitliche Wahrheit** – Strategiegespräch, operative Fixes und **anschließende Zielgruppen-/Persona-Arbeit** (z. B. mit AUDION) können sich auf **dieselben Daten zur öffentlichen Site** beziehen.

---

## Kontinuierliche Evaluierung: Warum „stetig“ den Unterschied macht

| Einmal-Audit (klassisch) | Laufende Orientierung (mit CHECKION denkbar) |
|--------------------------|-----------------------------------------------|
| Snapshot, schnell veraltet | **Messpunkte** passen sich eurem **Release-Takt** an |
| PDF im Schrank | **Verlauf**, Trends, Regressionen nach Deploys erkennbar |
| Spezialistenwissen gebündelt | **Transparenz** für mehr Rollen – ohne jedes Mal externe Audits |
| Hohe Kosten pro Welle | Skalierung über **Projekte**, Wiederholungen und eingebettete Abläufe |

CHECKION ersetzt nicht eure strategische Bewertung – aber es liefert die **Faktenlage**, auf der sich **Führung, Fachbereiche und Umsetzung** wiederfinden, statt mit unterschiedlichen „Stand heute“-Stories zu operieren.

---

## Kurzbeschreibung (Positionierung)

**CHECKION** ist eine **Plattform für Website-Qualität, Barrierefreiheit und Sichtbarkeit in KI-gestützter Suche (GEO)**. Teams erfassen **einzelne Seiten**, **ganze Domains**, **KI-gestützte Journeys** und **GEO/E-E-A-T-Analysen** – gebündelt in **Projekten** mit Wettbewerbs- und Rank-Tracking-Kontext, **Research-Unterstützung** und **Teilen** von Ergebnissen für Stakeholder.

---

## 1. Produktkern (technische Referenz – Ist-Stand im Repo)

*Die folgende Tabelle beschreibt die **fachliche Tiefe** für Produkt, Enablement und Implementierung. Sie spiegelt wider, **welche Bausteine** zur Verfügung stehen – unabhängig davon, ob Nutzer:innen die Oberfläche oder eingebettete Prozesse nutzen.*

| Bereich | Funktion (Ist-Stand im Repo) |
|--------|------------------------------|
| **Organisation** | **Projekte** (`projects`): Name, Domain, **Wettbewerber** (`competitors`), **GEO-Fragen** (`geo_queries`); gruppieren Single-Scans, Domain-Scans, Journey-Runs, GEO/E-E-A-T-Runs; löschen setzt Zuordnungen auf `null`. |
| **Projekt-Research** | `POST /api/projects/[id]/research` – ein Agentenlauf (Structured Outputs): u. a. **Zielgruppen-Vorschläge**, Value Proposition, SEO-Keywords, GEO-Queries, Competitors; Ergebnis im UI editierbar und per Chips ins Projekt übernehmbar. |
| **Single-Page-Scan** | `POST /api/scan` – WCAG/axe-basierte Checks, Performance-/SEO-relevante Metriken, Screenshots, optional **LLM-Zusammenfassung** (`/api/scan/[id]/summarize`), **Klassifikation** (`/classify`), **UX-Check** (`/ux-check` – Claude-basiert v2), Zuordnung zu Projekt. |
| **Domain-Scan (Deep Scan)** | Crawl/Sitemap-basiert viele Seiten; Status, Summary, **Issue-Groups**, **slim-pages** (inkl. `pageClassification` für Downstream-Aggregation), Bundle-Download, **Domain-Journey** aus gecrawlten Links (`/api/scan/domain/[id]/journey`). Nutzungs-Reporting pro Seite (`domain_scan_page`) an PLEXON. |
| **UX Journey Agent** | `POST /api/scan/journey-agent` – **echter Browser** (Playwright / separater Python-Service via `UX_JOURNEY_AGENT_URL`), Aufgabe in Natursprache; unterscheidet sich vom **Domain-Journey** (nutzt nur bereits gecrawlte Struktur). Live-Stream/Video-Routen für Agent-Jobs vorhanden. |
| **GEO / E-E-A-T** | `POST /api/scan/geo-eeat` – intensiver Lauf mit LLM-Stufen, optional **Wettbewerbs-Vergleich**; Status, History, **Rerun Competitive**; KI-Vorschläge für Competitors/Queries (`suggest-competitors-queries`); Zuweisung zu Projekten. UI: `/geo-eeat/[jobId]`, Projekt-Karten GEO/Summary/Analysis. |
| **Rank Tracking** | Keywords pro Projekt; SERP-Positionen (Serper o. Ä.); Refresh (`/api/rank-tracking/refresh`); Zusammenfassung pro Projekt (`ranking-summary`). |
| **Domain- & Performance-Rollups** | Projektseite: **Domain Summary** (eigene Domain + Wettbewerber), **Scan all** / Deep-Scan-Steuerung; Aggregation u. a. Performance, Eco-/Gewichtung je nach Implementierung. |
| **WCAG / SEO-Ansichten (Projekt)** | Routen z. B. `/projects/[id]/wcag`, `/seo` – fokussierte Auswertungen im Projektkontext. |
| **Tools / Checks** | Kontrast (`/api/tools/contrast`, `/api/checks/contrast`), **PageSpeed** (`/api/tools/pagespeed`), **SSL Labs** (`/api/tools/ssl-labs`), **Wayback** (`/api/tools/wayback`), **Readability**, **Content-Extract** (Puppeteer); teils nutzungsrelevant nur mit Auth. |
| **Saliency** | Heatmap/Saliency-Jobs (`/api/saliency/generate`, `/api/saliency/result`) – visuelle Aufmerksamkeit auf Screenshots. |
| **Journeys (gespeichert)** | CRUD `/api/journeys` – gespeicherte Journeys (u. a. aus Domain-Kontext); MCP: `journey_save`, `journeys_list`, … |
| **Sharing** | Share-Links mit Token (optional Passwort); Zugriff auf Metadaten, Seiten, Screenshots, Video je nach Resource; `share_by_resource`, Revoke. |
| **Suche** | `/api/search` – Suche über Scan-Inhalte (MCP: `checkion.search`). |
| **Remediation-Hinweise** | WCAG-Issues mit **helpUrl** / Fix-Dokumentation (Deque/WAI) in UI. |
| **Auth & API** | NextAuth, Register, Profil, Passwort; **API-Tokens** (`/api/auth/tokens`) für Automation; **Developers**-Seite; optional **Admin-User-Routen**. |
| **i18n** | DE/EN (u. a. `locales/de.json`, `en.json`). |
| **MCP** | Eigener **MCP-Server** (`mcp-server/`) – exponiert Scans, Projekte, GEO, Journeys, Tools, Share, Saliency als Tools für Cursor/Claude/Boards. Optional Proxy unter App-Pfad `/mcp` (`MCP_SERVER_URL`). |

---

## 2. Navigations- und UI-Module (Web-App)

Zentrale Routen (s. `lib/constants.ts`):

- `/` – Start  
- `/scan`, `/scan/domain` – Scan starten (Single, Deep, Journey-Agent, GEO)  
- `/results/[id]` – Einzelseiten-Ergebnis  
- `/domain/[id]` – Domain-Scan-Ergebnis (Sections via `[[...section]]`)  
- `/journey-agent/[jobId]` – UX-Journey-Agent Job  
- `/geo-eeat/[jobId]` – GEO/E-E-A-T Job  
- `/projects`, `/projects/[id]` – Projekte inkl. Research, Competitors, Keywords, GEO-Fragen, Aktivität  
- `/projects/[id]/rankings`, `/geo`, `/geo/analysis`, `/wcag`, `/seo`, `/research`  
- `/share/[token]` – Geteilte Ansicht  
- `/history` – Verlauf  
- `/settings` – Einstellungen (Brand u. a.)  
- `/developers` – API-Hinweise  
- `/login`, `/register`  

---

## 3. Verständnis für „die Website als Produkt“ – über reine Compliance hinaus

CHECKION liefert nicht nur **Ampeln**, sondern **ein belastbares Bild davon, was die Domain nach außen darstellt** – inhaltlich, technisch und für **KI-Antworten (GEO)** relevant. Das ist für Stakeholder der Brückenbau zwischen **„wir müssen compliant sein“** und **„wir wollen verstanden und gefunden werden“**.

### 3.1 Von der Einzelseite zur Domain-Story

- **Single-Scan:** Schnelle Antwort auf „ist diese Landingpage fit?“ (A11y, technische Signale, optional UX-Review durch Modell).  
- **Deep Scan:** Muster über viele URLs – **wo bricht Qualität ein?** Issue-Groups und Rollups unterstützen **Priorisierung** statt Punkt-Fixes.  
- **Klassifikation / Topics:** Seiten werden u. a. für **Themen-Aggregation** aufbereitet; das ist die Basis dafür, dass Partner-Systeme (z. B. **AUDION**) **Site-Topics** für Zielgruppen- und Persona-Arbeit ableiten können (s. AUDION `knowledge/checkion-site-topics.md` im Repo **AUDION-v2**).

### 3.2 GEO & Wettbewerb

- GEO/E-E-A-T-Läufe machen **sichtbar**, wie Inhalte und Signale im **LLM-/Such-Kontext** wirken könnten – inkl. **Vergleich** mit konfigurierten Wettbewerbern.  
- **Nutzen:** Nicht nur SEO-Classic, sondern **„wie erklären wir unsere Marke KI-gestützten Antworten?“** – eng mit **Projekt-Research** und vorgeschlagenen **GEO-Queries** verzahnt.

### 3.3 Journeys: zwei Welten

| Modus | Was ihr versteht |
|--------|-------------------|
| **Domain-Journey** | Wie Nutzer:innen sich **innerhalb des bereits gecrawlten Graphen** bewegen könnten – schnell, ohne Live-Browser. |
| **UX Journey Agent** | Ob eine **konkrete Aufgabe** in der echten UI **durchführbar** ist (Klickpfade, Schmerzpunkte) – näher an **Task-Completion** und **Conversion-Risiko**. |

### 3.4 Voice / Video

CHECKION selbst ist **kein** Voice-/Video-Persona-Produkt wie AUDION/Tavus. **Video** bezieht sich hier u. a. auf **Journey-Agent-Outputs** (Aufzeichnung/Stream der Browser-Session) – zur **Dokumentation und Nachvollziehbarkeit** von Abläufen, nicht auf Gespräch mit einer Zielgruppen-Persona.

---

## 4. Use Cases (geschäftlich / methodisch)

1. **Release- und Compliance-Gates**  
   Vor und **nach** Go-Live: kritische URLs und **gesamte Domain** auf WCAG- und Qualitätsregress prüfen; Fix-Links an Umsetzungsteams – **wiederholbar** im eigenen Takt.

2. **Priorisierte Backlogs statt Issue-Wolken**  
   Deep Scan + Gruppierung → **wo lohnt sich der Fix** für Risiko und Reichweite? Entscheidungsvorlagen für PO und Engineering.

3. **GEO-Readiness & Wettbewerbslage**  
   GEO/E-E-A-T inkl. Competitive Runs; Abgleich mit **Projekt-Competitors** und **GEO-Fragen** – für **Gremien**, die „AI Search“ nicht nur als Buzzword diskutieren wollen.

4. **Projekt als „Single Pane of Glass“**  
   Kunde/Marke: Domain, Wettbewerber, Keywords, Research-Ergebnis, letzte Scans – **ein Hub** für Marketing, SEO und PM; weniger **Tool- und Excel-Fragmentierung**.

5. **Stakeholder-Transparenz ohne Vollzugriff**  
   **Share-Links** für ausgewählte Ergebnisse – z. B. Management, Agentur, Auditoren (je nach Policy).

6. **Qualität und Sichtbarkeit im Betriebsrhythmus verankern**  
   Gleiche Messlogik **nach jedem relevanten Deploy**, in der **Nachtestung** oder im **Agenten-Workflow** – ohne dass jedes Mal manuell dieselben Klicks in einer Oberfläche nötig sind. Ziel: **Regression früh erkennen**, nicht erst nach Beschwerden oder Ranking-Verlust.

7. **Speisung von Downstream-Persona-Arbeit (AUDION)**  
   Verknüpftes CHECKION-Projekt + Deep Scan → **Topics/Tags** für **Persona- und Zielgruppen-Vorschläge** in AUDION (optional `checkion_project_id` auf AUDION-Projektseite) – **öffentliche Realität** und **Zielgruppenmodell** bleiben konsistent.

8. **Planbarkeit von Nutzung und Kosten**  
   Mit **PLEXON**: Nutzung wird in **Tokens** abgebildet – hilft bei **Mandantenfähigkeit**, Forecast und interner **Chargeback-Transparenz** (s. `knowledge/checkion-usage-tracking-coverage.md`).

---

## 5. Mehrwert aus Nutzer- und Stakeholder-Sicht

### 5.1 Rollen im Überblick

| Rolle / Situation | Was wird konkret besser? |
|-------------------|---------------------------|
| **Geschäftsführung / Bereichsleitung** | **Eine belastbare Linie** zur digitalen Außendarstellung: Compliance-Risiko, Wettbewerb, GEO – ohne nur auf Einzelmeinungen zu hören. **Wiederholbare** Lagebilder statt veralteter Audit-PDFs. |
| **Marketing- & Markenverantwortung** | Klare **Themen- und Seitenlandschaft**, **Wettbewerbsvergleiche**, **GEO-Narrative** – Abstimmung mit Content und Kampagnen auf **Messung**, nicht nur auf Intuition. |
| **Product Owner / Produktmanagement** | **Priorisierte** technische und UX-Themen aus Domain-Sicht; **Journeys** zeigen Reibung bei Kernaufgaben; Research-Karte liefert **Startpunkte** für Zielgruppen und Keywords. |
| **Engineering / QA / DevOps** | Schnelle **Feedback-Schleifen**; Deep Scan als **Regressionssensor** nach Releases; Remediation-Links; **Einbettung** in den eigenen Delivery-Prozess möglich. |
| **SEO & Content** | Keywords, Rankings, GEO-Läufe und **Zitat-/Struktur-Signale** an einem Projektort; weniger Tool-Hopping. |
| **Accessibility- & Compliance-Rollen** | Domain-weite **Evidenz**, Share für Nachweise; klare **Fix-Pfade**. |
| **Agenturen / Beratung** | Skalierung über **Projekte** und Kunden; wiederholbare Lieferobjekte; **einheitliche** Messmethodik. |
| **Enablement & Sales (intern/extern)** | **Verständliche** Reports und Shares; dieselben Kennzahlen für **Pitch** und **Nachbetreuung**. |

### 5.2 Kernaussage (über alle Rollen)

CHECKION reduziert **Unsicherheit** darüber, wie gut die öffentliche Site wirklich ist – **technisch, barrierefrei und im KI-Suchlicht** – und macht Fortschritt **sichtbar über Zeit**. Das stärkt **Vertrauen intern** (weniger „Hoffnung als Strategie“) und **Verhandlungsfähigkeit extern** (Agentur, Audit, Regulierung). Die Plattform skaliert mit euch: vom **einzelnen kritischen Release** bis zur **dauerhaft gemessenen Domain-Landschaft** – und lässt sich dort einbinden, wo ihr ohnehin schon arbeitet, statt einen separaten „Audit-Marathon“ zu institutionalisieren.

---

## 6. Abgrenzung (was CHECKION nicht ersetzt)

- **Kein Ersatz für echte Nutzerforschung** (Interview, Beobachtung) – Journeys und Scans sind **synthetisch** oder **regelbasiert/modellbasiert**.  
- **GEO/E-E-A-T** im Produkt sind **Indikatoren und Heuristiken**, keine Garantie für Rankings oder LLM-Zitate (s. auch `knowledge/checkion-eeat-analysis.md` zu Abdeckung).  
- **Site-Topics** für Partner wie AUDION sind **Scanner-Metadaten**, keine verifizierten Nutzeraussagen.

---

## 7. Referenzen im Repo

- `README.md` – Einstieg, MCP-Hinweis  
- `mcp-server/README.md` – Tools, Docker, Coolify, `/mcp`-Proxy  
- `lib/constants.ts` – Pfade & API-Builder (keine Hardcodes in Komponenten)  
- `knowledge/checkion-projects-feature.md` – Projekte, Research, APIs  
- `knowledge/checkion-usage-tracking-coverage.md` – PLEXON-Events  
- `knowledge/ux-journey-agent.md` – UX Journey Agent vs. Domain-Journey  
- `knowledge/checkion-share-links.md` – Sharing  
- `knowledge/checkion-eeat-analysis.md` – E-E-A-T-Abdeckung  
- `knowledge/checkion-remediation-feature.md` – Fix-Dokumentation  
- Ökosystem: `knowledge/checkion-oekosystem-enablement-und-plugin-strategie.md`  

**Fremdrepo AUDION-v2:** `knowledge/checkion-site-topics.md` – wie AUDION CHECKION-Topics einbindet.

*Dieses Dokument spiegelt die im CHECKION-Repository sichtbare Funktionalität wider, nicht vertragliche Roadmaps.*
