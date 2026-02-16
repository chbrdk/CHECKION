# CHECKION – Page Index („Was wo & wie auffindbar“)

## Stand

- **Phase 1 (erledigt):** Regelbasierter Page-Index aus Quellcode
  - Typen in `lib/types.ts`: `PageIndex`, `PageIndexRegion`, `PageIndexRegionType`
  - `lib/page-index.ts`: `buildPageIndex(structureMap, viewportHeight, url)` – Regionen, Findability-Score, semantische Labels (Keyword/Regex + Landmark)
  - Scanner-Integration: jeder Scan liefert `result.pageIndex`
  - Tests: `npx tsx lib/page-index.test.ts`

- **Phase 2 (erledigt):** Saliency-Anreicherung
  - `PageIndexRegion.saliencyProminence` (0–1), optional, aus Heatmap-RGB (R-Kanal = „heiß“).
  - `enrichPageIndexWithSaliency(pageIndex, heatmapDataUrl)` in `lib/page-index.ts` (sharp); Aufruf in `POST /api/saliency/generate` nach Speichern der Heatmap, Anreicherung wird mit persistiert.
  - Kombinierter Findability: `findabilityScore + SALIENCY_WEIGHT * saliencyProminence` (SALIENCY_WEIGHT = 0.2), bei Darstellung nutzbar.

## Dashboard-Darstellung (Plan & Umsetzung)

- **Ort:** Tab „Struktur & Semantik“ (viewMode `structure`) – unter Document Outline und Structure Map.
- **Inhalt:**
  - **Liste „Seiten-Index (Auffindbarkeit)“:** Pro Region eine Zeile: Tag (z. B. h2, nav), Heading-Text (gekürzt), Above the fold (Ja/Nein), Findability-Score (Zahl), optional Saliency-Prominenz (Balken 0–1), semantischer Typ (Chip, z. B. pricing, faq, contact). Sortierung: indexInDocument oder nach Findability absteigend.
  - **Optional:** In der „Visuelle Analyse“-Ansicht Regionen-Rahmen auf dem Screenshot (Highlight bei Hover in der Liste), wenn `result.pageIndex` und Screenshot vorhanden; gleiche Skalierung wie Saliency-Overlay.
- **i18n:** Neue Keys unter `results.pageIndex.*` und `info.pageIndex` (Tooltip).
- **Komponente:** `components/PageIndexCard.tsx` (oder `PageIndexList.tsx`) – nimmt `pageIndex`, optional `highlightRegionId`, `onHighlightRegion`; optional zweite Komponente für Overlay-Rahmen oder Integration in bestehende Screenshot-Overlay-Logik.

### Phase 3: Persona & Klickpfade (später)

- Page-Index = Basis: Was wo, wie auffindbar, welcher semantischer Typ.
- Persona-Ziele (z. B. aus AUDION): „Informiert sich über Produkt XY“, „Sucht Preis“, „Will Kontakt“.
- Mapping: Persona-Ziel → gesuchte Region-Typen (z. B. „Preis“ → `semanticType === 'pricing'`).
- Evaluation: „Ist die erste passende Region above the fold? Ist findabilityScore hoch?“ → Ableitungen wie „Persona findet Preis schnell“ vs. „schlecht auffindbar“.
- **Gelernte Weights erst hier:** Wenn Klick- oder Annotations-Daten vorhanden sind, kleines Modell **auf** dem Page-Index (Features = Region-Typ, Findability, ggf. Saliency), nicht ein neues Saliency-Netz.

## Relevante Dateien

- `lib/types.ts` – PageIndex-Typen, ScanResult.pageIndex
- `lib/page-index.ts` – buildPageIndex, Heuristiken
- `lib/scanner.ts` – Aufruf buildPageIndex, pageIndex im Result
- `lib/page-index.test.ts` – Tests
- `app/api/saliency/generate/route.ts` – Saliency-API (Phase 2: hier oder beim Lesen pageIndex + Heatmap mergen)
- `saliency-service/main.py` – Heatmap-Erzeugung (MDS-ViTNet)
