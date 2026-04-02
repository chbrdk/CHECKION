# Struktur-Chip-Severity (Struktur & Semantik)

Die Chips in der Summary-Leiste von **Struktur & Semantik** werden je nach Korrektheit eingefärbt (grün = gut, orange = Warnung, rot = Problem).

## Heading-Chips (H1–H6)

Schwellenwerte in `app/results/[id]/page.tsx`: `STRUCTURE_HEADING_LIMITS`.

| Level | Gut (grün) | Warnung (orange) | Problem (rot) |
|-------|-------------|-------------------|---------------|
| H1    | 1           | —                 | > 1           |
| H2    | 1–8         | 9–14              | 15+           |
| H3    | 1–15        | 16–30             | 31+           |
| H4    | 1–25        | 26–50             | 51+           |
| H5    | 1–35        | 36–70             | 71+           |
| H6    | 1–45        | 46–90             | 91+           |

- **H1**: Nur eine H1 pro Seite ist Best Practice (Accessibility/SEO).
- **H2–H6**: Grobe Orientierung; zu viele Überschriften einer Stufe deuten auf flache oder unstrukturierte Hierarchie.

## Landmarks/Headings-Chip

- **Grün**: 1–12 Landmarks, 1–50 Headings (typische Seite).
- **Orange**: 0 Landmarks, oder 13–20 Landmarks, oder 51–80 Headings.
- **Rot**: > 20 Landmarks oder > 80 Headings (überladen/unübersichtlich).

Änderung der Schwellen: `STRUCTURE_HEADING_LIMITS` und `getLandmarksHeadingsSeverity()` in derselben Datei anpassen.

## Domain-Ansicht: Struktur & Semantik (Tab)

In `app/domain/[id]/page.tsx` (Tab **Struktur & Semantik**) zeigen Listen von URLs pro Zeile den **URL-Text** und einen **IconButton** (External-Link) mit Tooltip, der zur **Einzelergebnis-Seite** (`pathResults(page.id)`) navigiert. Zuordnung: `pagesByUrl.get(url) ?? pagesByNormUrl.get(norm(url))`, damit leicht abweichende URL-Strings trotzdem eine passende `SlimPage` finden. i18n: `domainResult.openPage` / `domainResult.openPageAria`.

## Domain-Ansicht: Links & SEO (Tab)

Derselbe Tab enthält **SEO (Domain)** und **Links (Domain)**. SEO-Zeilen („Seiten nach Inhalt & Dichte“) sind **Karten** mit URL + Icon zur Einzelanalyse und zweiter Zeile für Wortzahl / Top-Keywords / Skinny-Chip; Virtual-List-Schätzung: `DOMAIN_TAB_SEO_PAGE_ROW_ESTIMATE_PX`. **Links (Domain)** nutzt ein **3-Spalten-Statistik-Raster** (kaputt, eindeutig kaputt, Links gesamt mit intern/extern-Zeile) und die Liste „meiste kaputte Links“ als **Zeilen** mit URL, rotem Count-Chip und Icon. i18n u. a. `domainResult.seoWordCount`, `domainResult.linksStat*`, `domainResult.linksBrokenCount`.
