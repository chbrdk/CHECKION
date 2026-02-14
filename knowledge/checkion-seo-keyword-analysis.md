# CHECKION – SEO Keyword-Analyse

## Übersicht
Die SEO-Analyse wurde um eine **Keyword-Analyse** und **Keyword-Dichte** erweitert.

## Datenquelle
- **Body-Text:** `document.body.innerText` (sichtbarer Inhalt)
- **Stopwörter:** DE + EN (z. B. der, die, das, the, a, and, is, …) werden herausgefiltert
- **Tokenisierung:** Kleinbuchstaben, nur Buchstaben (inkl. ä, ö, ü, ß), Wörter mit Länge ≥ 2

## Berechnungen
- **Häufigkeit:** Anzahl Vorkommen pro Wort (ohne Stopwörter)
- **Dichte:** `(Anzahl / Gesamtwörter im Body) * 100` in %
- **Top-Keywords:** bis zu 15 häufigste Begriffe, sortiert nach Count

## Präsenz (Keyword Presence)
Für jedes Top-Keyword wird geprüft, ob es vorkommt in:
- **Title** (Seitentitel)
- **H1** (erste Überschrift)
- **Meta Description**

In der UI werden diese mit Badges „Title“, „H1“, „Meta“ markiert; Zeilen mit mindestens einer Präsenz werden hervorgehoben.

## Typen (lib/types.ts)
- `SeoKeywordAnalysis`: totalWords, topKeywords, keywordPresence, metaKeywordsRaw
- `KeywordDensityItem`: keyword, count, densityPercent
- `KeywordPresenceItem`: keyword, inTitle, inH1, inMetaDescription

## UI (SeoCard)
- Sektion „Keyword-Analyse“ mit Gesamtwortzahl und Hinweis auf Dichte
- Tabelle/Liste: Keyword, Count, Dichte %, Badges Title/H1/Meta
- Falls vorhanden: Anzeige von `meta name="keywords"` (metaKeywordsRaw)

## Erweiterungsideen
- Fokus-Keyword manuell eingeben und Dichte + Präsenz dafür anzeigen
- Keyword-Dichte-Warnung (z. B. > 3 % als mögliches Keyword-Stuffing)
- Mehrsprachige Stopwort-Listen je nach `html lang`
