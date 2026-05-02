# Struktur & Semantik (Einzelergebnis)

- **Ort:** `app/results/[id]/page.tsx`, `viewMode === 'structure'`.
- **Kein Document Outline mehr:** Die Outline-Liste war inhaltlich identisch mit den Überschriften in der Struktur-Map (beides aus `headingHierarchy.outline` ↔ Heading-Teil von `structureMap` im Scanner). Es gibt nur noch **eine** Liste unter „Reihenfolge im Dokument“ (`StructureMap`, `embedded`).
- **Kopfzeile:** Eine Textzeile mit Landmarks, Heading-Anzahl und kompakter H1–H6-Zählung (`formatStructureLevelParts`). Qualität (eine H1, übersprungene Level) einmal als Erfolgstext oder `Alert`, nicht doppelt.
- **Seiten-Index:** Eigener Accordion-Block; `PageIndexCard` mit `showHeader={false}`, damit der Titel nicht dreimal vorkommt.
