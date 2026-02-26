# Saliency-Fusion: SUM + DOM/Struktur + optional LLM Vision

Die Aufmerksamkeits-Heatmap kombiniert mehrere Signale in der App-Schicht (Next.js). Der SUM-Service bleibt unverändert (liefert weiterhin PNG mit Post-Processing + Jet).

## Architektur

1. **SUM-Pfad:** Client startet Job → pollt Result. Wenn Job `completed`: SUM-Heatmap wird mit **pageIndex** (DOM/Struktur) und optional mit **gecachten LLM-Vision-Regionen** fusioniert → gefusionierte PNG wird gespeichert und für `enrichPageIndexWithSaliency` genutzt.
2. **AI-Pfad:** Vision-Regionen → Heatmap aus Regionen → Fusion mit pageIndex (falls vorhanden) → Speichern + Enrich.
3. **pageIndex** kommt vom Scan (`structureMap` → `buildPageIndex`); enthält pro Region `rect`, `findabilityScore`, `aboveFold`, `semanticType` (hero, nav, …).

## Env-Variablen

| Variable | Bedeutung | Default |
|----------|------------|--------|
| `SALIENCY_FUSION_STRUCTURE_WEIGHT` | Gewicht der DOM/Struktur-Map bei der Fusion (0 = aus). | `0.45` |
| `SALIENCY_LLM_REGIONS` | `true`/`1`: Im SUM-Pfad zusätzlich LLM Vision aufrufen und Regionen in Fusion einrechnen. | aus |
| `SALIENCY_FUSION_VISION_WEIGHT` | Gewicht der LLM-Vision-Map (nur wenn LLM-Regionen aktiv). | `0.2` |

LLM Vision ist optional und kostentransparent: wird nur bei gesetztem `SALIENCY_LLM_REGIONS` und `OPENAI_API_KEY` einmal pro „Analyse starten“ aufgerufen; Ergebnis wird per jobId gecacht und in der Result-Route bei Fusion verwendet.

## Struktur-Map: Rechteck-Füllung

Die DOM-Struktur-Map füllt **jede Region mit ihrem vollen Rechteck** (Position und Größe aus dem Scan). Die Rect-Koordinaten stammen aus `getBoundingClientRect()` + Scroll im Scanner und sind identisch mit dem Screenshot-Koordinatensystem. So wird z. B. die komplette Nav-Leiste als Fläche erfasst, nicht nur ein Punkt in der Mitte. Gewicht pro Region: `findabilityScore * aboveFold-Boost * semanticBoost` (hero/nav stärker).

## Code

- **Fusion:** [lib/saliency-fusion.ts](../lib/saliency-fusion.ts) – `buildStructureAttentionMap` (Rechteck-Füllung), `buildVisionPriorMap`, `decodeJetPngToIntensity`, `intensityToJetPng`, `fuseSaliencyHeatmap`.
- **Vision-Cache:** [lib/saliency-vision-cache.ts](../lib/saliency-vision-cache.ts) – `setVisionRegions`, `getVisionRegions` (TTL 15 Min).
- **Integration SUM:** [app/api/saliency/result/route.ts](../app/api/saliency/result/route.ts) – nach Erhalt der Heatmap Fusion mit pageIndex und gecachten Vision-Regionen.
- **Integration AI:** [app/api/saliency/generate/route.ts](../app/api/saliency/generate/route.ts) – AI-Heatmap wird mit pageIndex fusioniert; optional im SUM-Pfad Fire-and-Forget Vision-Aufruf und Cache-Schreiben.

## Tests

- Nach `npm install`: `npm run test:saliency-fusion` bzw. `npx tsx lib/saliency-fusion.test.ts` – Unit-Tests für Structure-Map, Vision-Map, Decode/Encode-Roundtrip und `fuseSaliencyHeatmap`.
