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
  - **Umsetzung:** In der „Visuelle Analyse“-Ansicht: Toggle „Regionen hervorheben“; bei Aktivierung zeichnet `PageIndexRegionsOverlay` alle Region-Rects auf dem Screenshot, die hervorgehobene Region (bei Hover in der Liste) mit grünem Rahmen und Label. Kompakte Regionen-Liste unter dem Screenshot mit Hover → setzt `hoveredRegionId`.
- **i18n:** Keys unter `results.pageIndex.*`, `results.showRegionHighlight`, `results.hoverToHighlight`, `info.pageIndex`.

### Erweiterungen (Buttons & Absätze, Auto-Heatmap)

- **Structure Map:** Im Scanner erweitert um `button`, `[role="button"]`, `p` (Level 7 = Button, 8 = Absatz), in Dokumentreihenfolge. Findability: Button 0.8, Absatz 0.4 – so ist erkennbar, wenn z. B. das Produkt nur im Absatz und nicht in der Headline vorkommt (Optimierungspotenzial).
- **Heatmap automatisch:** Beim Laden der Ergebnis-Seite wird einmalig `POST /api/saliency/generate` ausgelöst, wenn `screenshot` vorhanden und `saliencyHeatmap` fehlt (Ref verhindert Doppelaufruf).

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
