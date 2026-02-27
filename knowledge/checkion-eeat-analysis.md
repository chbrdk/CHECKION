# E-E-A-T Analyse in CHECKION

## Aktueller Stand

Die **E-E-A-T**-Signale (Experience, Expertise, Authoritativeness, Trustworthiness) werden derzeit nur **teilweise** abgedeckt und in der UI als **„Autorität & Expertise“** in der Generative-Optimizer-Card angezeigt.

### Was wir heute erfassen

| E-E-A-T | Erfasst | Wo / Wie |
|--------|--------|----------|
| **Experience** | ❌ Nein | – |
| **Expertise** | ⚠️ Teilweise | **Autor-Bio:** DOM-Selektoren `.author-bio`, `[itemprop="author"]`, `.byline`, `.author-info` oder Text „about the author“. **Experten-Zitate:** Zählung von `[1]`, `source:`, `quelle:`, Statistiken, % im Body → „Experten-Zitate“ wenn > 3. |
| **Authoritativeness** | ❌ Nein | (Würde Backlinks/Mentions brauchen – nicht im Scanner.) |
| **Trustworthiness** | ⚠️ Indirekt | Privacy (Datenschutz, Cookie-Banner, AGB), Security-Headers, HTTPS – aber nicht als eigenes „Trust“-Modul benannt. |

Zusätzlich vorhanden, aber **nicht** in der E-E-A-T-Sektion:
- **Article-Schema:** `articleSchemaQuality` (hasDatePublished, hasDateModified, hasAuthor) – wird unter „Technical“ gezeigt.
- Zitate-/Content-Metriken (FAQ, Tabellen, Listen, citationCount) fließen in den GEO-Score ein.

### Wo es im Code steckt

- **Scanner:** `lib/scanner.ts` – `hasAuthorBio`, `citationCount`, `articleSchemaQuality`.
- **Typen:** `lib/types.ts` – `generative.expertise: { hasAuthorBio, hasExpertCitations }`.
- **UI:** `components/GenerativeOptimizerCard.tsx` – Sektion „Autorität & Expertise“ mit zwei Chips.

---

## Was eine „gute“ E-E-A-T-Analyse ausmacht

1. **Experience (E)**  
   Signale für eigene Erfahrung: z. B. „Über uns“, Fallstudien, Nutzerberichte, First-Hand-Formulierungen.  
   → Heute: nicht erfasst.

2. **Expertise (E)**  
   Autor, Qualifikation, Quellen/Zitate, strukturierte Daten (Author, Person).  
   → Heute: Autor-Bio + grobe Zitat-Zählung; Article-Author nur unter Technical.

3. **Authoritativeness (A)**  
   Bekanntheit der Seite/Person (Backlinks, Erwähnungen, Awards).  
   → Heute: nicht möglich ohne externe Daten (z. B. Backlink-API).

4. **Trustworthiness (T)**  
   Impressum, Kontakt, Datenschutz, HTTPS, klare Kennzeichnung (Medizin/Recht), keine Täuschung.  
   → Heute: Privacy + Security vorhanden, aber nicht als „Trust“-Score/E-E-A-T-Block gebündelt.

---

## Mögliche Erweiterungen (ohne Backlink-Daten)

- **Experience:** Heuristiken wie „Über uns“-Link, „Kontakt“, „Team“, „Case Study“-Texte, bestimmte Phrasen.
- **Expertise:** Article-Schema-Author in die E-E-A-T-Sektion ziehen; ggf. Person/Organization-Schema prüfen; Zitat-Erkennung verfeinern.
- **Trust:** Eigenen Block „Vertrauen“ mit Impressum, Kontakt, Datenschutz, HTTPS, Security-Header (aus bestehenden Audits ableiten) und ggf. E-E-A-T-Score oder Ampeln.
- **UI:** E-E-A-T als eigene Karte mit vier Bereichen (E, E, A, T) und klaren Ja/Nein- oder Score-Anzeigen.

Wenn du willst, können wir als Nächstes eine konkrete Erweiterung (z. B. nur Trust-Block oder Experience-Heuristiken) umsetzen.

---

## GEO / E-E-A-T Intensivanalyse (eigenständiger Modus)

Seit Implementierung der **GEO / E-E-A-T Intensivanalyse** gibt es einen vierten Scan-Modus, der E-E-A-T und GEO vertieft auswertet und optional einen **Competitive LLM Citation Benchmark** (Sichtbarkeit in LLMs vs. Konkurrenz) anbietet. Siehe **`knowledge/checkion-geo-eeat-intensive-scan.md`** für Ablauf, Datenmodell, API und UI.
