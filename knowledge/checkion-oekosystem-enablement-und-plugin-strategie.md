# CHECKION im Ökosystem – Enablement, PLEXON, AUDION & Einbettung in den Betrieb

**Ziel:** Sales, Enablement und Produkt – CHECKION **für Entscheider und Anwender:innen** einordnen: **Mehrwert**, **Dauerhaftigkeit der Messung** und **nahtlose Einbettung** in bestehende Organisationen – ergänzt um **PLEXON** und **AUDION**.

Funktionale Tiefe und Stakeholder-Narrativ: [`checkion-funktionen-und-use-cases.md`](./checkion-funktionen-und-use-cases.md).

---

## 1. Executive Summary (Stakeholder)

Digitale Auftritte sind **kein Projekt mit Enddatum**, sondern ein **laufend veränderter Bestand**: Releases, neue Inhalte, Wettbewerber, Such- und KI-Ökosysteme. CHECKION adressiert genau diese Realität: Es liefert eine **gemeinsame Evidenzbasis** für Barrierefreiheit, Site-Qualität und **GEO** – und kann so organisiert werden, dass Messungen **nicht nur einmal**, sondern **im Rhythmus eures Betriebs** stattfinden.

**Was Organisationen davon haben**

- **Weniger Überraschungen nach Livegang** – Regressionen und qualitative Drift werden **früher** sichtbar.  
- **Weniger Reibung zwischen Fachbereichen** – Marketing, Produkt, IT und Compliance sprechen über **dieselben Kennzahlen und Scans**.  
- **Kein Zwang zu einer isolierten „Audit-Insel“** – dieselbe Plattform, die im Alltag im Browser genutzt wird, lässt sich **in eure bestehenden Abläufe** einbinden (Lieferketten, Qualitätssicherung, KI-gestützte Workflows). Technische Details sind dafür vorhanden, müssen aber **nicht** jede Verkaufsgesprächsführung dominieren; entscheidend ist: **Messlogik und Ergebnisse** bleiben konsistent.

Im Verbund mit **PLEXON** und **AUDION**:

- **PLEXON:** **Ein Login**, Profil, **nachvollziehbare Nutzung** (Token-Logik) – sinnvoll für Mandanten, Budget und Forecast. Boards können **CHECKION**- und **AUDION**-Fähigkeiten in **einer** KI-Sitzung kombinieren: erst messen, dann aus Nutzerperspektive spiegeln.  
- **AUDION:** Nutzt u. a. **Site-Topics** aus CHECKION, damit **Personas und Zielgruppen** nicht losgelöst von der **öffentlichen Site** gedacht werden (s. Repo **AUDION-v2**, `knowledge/checkion-site-topics.md`).

**Kernbotschaft:** *„Ihr Web- und GEO-Bild ist nicht ein Stichtag – es kann Teil eurer **kontinuierlichen Steuerung** werden und dieselbe Wahrheit in Strategie, Umsetzung und – optional – Zielgruppenmodellen tragen.“*

---

## 2. Die drei Säulen im Überblick

| Säule | Rolle | Nutzen für die Organisation |
|--------|--------|------------------------------|
| **CHECKION** | Messung der **öffentlichen** Website: Qualität, WCAG, Deep Domain, GEO, Journeys | **Evidenz**, **Trends**, **Wettbewerb** – wiederholbar und teilbar |
| **AUDION** | Personas, Dialoge, Produkt-Journeys | **Abgleich** zwischen Site-Realität und Zielgruppen-Verständnis |
| **PLEXON** | Identität, Nutzung, Boards | **Governance** und **orchestrierte** Zusammenarbeit über Produkte hinweg |

---

## 3. CHECKION ↔ AUDION (Mehrwert)

| Aspekt | Nutzen |
|--------|--------|
| **Site-Topics** | Themenlandschaft der Site fließt in **Zielgruppen- und Persona-Vorschläge** – weniger „erfundene“ Segmente. |
| **Verknüpftes CHECKION-Projekt (AUDION-Seite)** | Direkter Bezug zur Domain-Analyse ohne doppelte Pflege. |
| **Gemeinsame Story** | „Was wir **nach außen** sind“ (CHECKION) und „wie **Zielgruppen** reagieren könnten“ (AUDION) – **ein Narrativ** für Workshops und Freigaben. |

**Kommunikationshinweis:** Topics sind **Scanner-Metadaten**, keine Nutzerzitate.

---

## 4. CHECKION ↔ PLEXON (Mehrwert)

- Nutzungsereignisse aus CHECKION werden – wo konfiguriert – an PLEXON gemeldet und in **Tokens** übersetzt (`checkion-usage-tracking-coverage.md`).  
- **Nutzen für Stakeholder:** **Planbarkeit**, faire Verteilung bei mehreren Teams oder Mandanten, **Transparenz** gegenüber Finance und Einkauf – ohne dass jedes Produkt eigene Abrechnungsregeln erfindet.

---

## 5. Einbettung: CHECKION im bestehenden Betrieb

### 5.1 Kontinuität statt Einmal-Messung

- **Im Browser:** Projekte, Verlauf, Shares – für Menschen, die **steuern und kommunizieren**.  
- **Im Rhythmus von Releases und QA:** Dieselben Checks **automatisiert** anstoßen – damit „gestern noch grün“ nicht heute unbemerkt rot ist.  
- **In KI- und Agenten-Workflows:** Dieselbe Messlogik steht **Assistenzsystemen** zur Verfügung – nützlich für **PLEXON-Boards**, IDE-Integrationen und interne Automatisierung.

### 5.2 Was wir Kund:innen **versprechen** sollten (ohne Technik-Vortrag)

- **Kein Bruch** zwischen „das hat die Agentur gemessen“ und „das misst unsere IT“ – **eine Plattform**, eine Methodik.  
- **Skalierbarkeit** von einer Domain zu vielen Marken oder Ländern über **Projekte**.  
- **Nach außen kommunizierbare** Ergebnisse (Scores, Shares, Reports) – **nach innen umsetzbare** Prioritäten (Issues, Gruppen, Fix-Links).

### 5.3 Integrationsmatrix (Kurz)

| Zugang | Stakeholder-Nutzen |
|--------|---------------------|
| **Web-App** | Steuerung, Transparenz, Zusammenarbeit |
| **Eingebettete / wiederkehrende Messungen** | Kontinuierliche Evaluierung, Regressionsschutz |
| **KI-Orchestrierung (z. B. Board)** | Kombination aus Messung und inhaltlicher Reflexion |
| **Geteilte Links** | Management, Audit, Partner – ohne Vollzugriff |

*Technische Einrichtung (Tokens, MCP, Proxy):* `mcp-server/README.md`.

---

## 6. Nutzenpyramide (global)

1. **Operativ:** Schnellere **Verbesserungszyklen**, weniger Nacharbeit in Live.  
2. **Strategisch:** GEO und Wettbewerb **im Projekt** – Entscheidungen mit **Messung** unterfüttert.  
3. **Ökonomisch:** Nutzung **planbar** (PLEXON), weniger teure Fehlstarts.  
4. **Kulturell:** **Eine Sprache** für Qualität und Sichtbarkeit – statt konkurrierender Excel-Wahrheiten.

---

## 7. Kombinierte Szenarien

| Szenario | CHECKION | AUDION | PLEXON |
|----------|----------|--------|--------|
| **Kontinuierlicher Relaunch** | Vor/nach Messung, Trend | Personas an neue Topics | Nutzung & Budget |
| **Executive Alignment** | Share + Summary | Optional: Zielgruppen-Dialog | Einheitlicher Zugriff |
| **Multi-Mandant / Konzern** | Projekte pro Marke | Optional Topics je Site | Token & Identität |
| **Workshop „Site + Zielgruppe“** | Messung & Wettbewerb | Persona-Spiegel | Board mit beiden Welten |

---

## 8. Referenzen

- CHECKION: `mcp-server/README.md`, `knowledge/coolify-vollstaendige-anleitung.md`, `lib/constants.ts`  
- PLEXON Board: Repo **PLEXON**, `knowledge/audion-mcp-board-tools.md`  
- AUDION: `knowledge/checkion-site-topics.md`, `Docs/environment-variables.md` (`CHECKION_API_*`)

---

*Enablement-Dokument; konkrete Features je nach Deploy und Vereinbarung.*
