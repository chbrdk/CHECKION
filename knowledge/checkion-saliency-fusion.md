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

## Scanpath (Blickreihenfolge)

Wenn Heatmap und pageIndex vorhanden sind, wird automatisch ein **Scanpath** (geschätzte Fixationsreihenfolge) berechnet: lokale Maxima in der Heatmap, F-Pattern-Position, Regionengröße, Inhibition-of-Return. Ergebnis: `ScanResult.scanpath` (Array von `{ x, y, order, regionId?, saliency? }`). Auf der Ergebnis-Seite kann der Scanpath als nummerierte Punkte (1, 2, 3, …) eingeblendet werden.

- **Code:** [lib/scanpath.ts](../lib/scanpath.ts) – `computeScanpath`; Integration in [app/api/saliency/result/route.ts](../app/api/saliency/result/route.ts) und [app/api/saliency/generate/route.ts](../app/api/saliency/generate/route.ts).
- **UI:** [components/ScanpathOverlay.tsx](../components/ScanpathOverlay.tsx); Toggle „Scanpath anzeigen“ im Visual-Tab der Ergebnisseite.
- **Konfiguration:** Default `maxFixations=8`, `iorRadius=100`; optional per Env erweiterbar.

## Leichtes Backend (MSI-Net / ONNX)

Neben SUM kann ein **ONNX-basiertes** Saliency-Backend betrieben werden (CPU-freundlich, ~1–3 s auf M-Chip): gleiche API (`POST /jobs`, `GET /jobs/{job_id}`). Build mit `Dockerfile.msinet`, Modell unter `MSINET_MODEL_PATH` (z. B. `/app/model.onnx`) bereitstellen. CHECKION zeigt mit `SALIENCY_SERVICE_URL` auf SUM oder auf den ONNX-Container.

- **Service:** [saliency-service/main_msinet.py](../saliency-service/main_msinet.py), [saliency-service/Dockerfile.msinet](../saliency-service/Dockerfile.msinet).
- **Hinweis:** MSI-Net ist nativ Keras; für ONNX muss ein Modell exportiert werden oder ein anderes ONNX-Saliency-Modell verwendet werden. OpenVINO: Für Intel-CPU kann ein Export auf OpenVINO zusätzlich 2–4× Speedup bringen (optional, keine Implementierung im Repo).

## Optionale Erweiterungen

- **MediaPipe (Face/Gaze):** In der Fusion unterstützt: `mediaPipeRects` (Rechtecke + Score in Pixel), `mediaPipeWeight`. Prior-Map `buildMediaPipePriorMap` in [lib/saliency-fusion.ts](../lib/saliency-fusion.ts). Die eigentliche Erkennung (MediaPipe im Service oder eigene Route) ist nicht implementiert; die Anbindung in der Fusion ist vorbereitet.
- **Vision-Provider:** `SALIENCY_VISION_PROVIDER=openai|claude|gcp` – aktuell nur `openai` umgesetzt; `claude`/`gcp` liefern leere Regionen (Stub).

## Code

- **Fusion:** [lib/saliency-fusion.ts](../lib/saliency-fusion.ts) – `buildStructureAttentionMap` (Rechteck-Füllung), `buildVisionPriorMap`, `buildMediaPipePriorMap`, `decodeJetPngToIntensity`, `intensityToJetPng`, `fuseSaliencyHeatmap`.
- **Vision-Cache:** [lib/saliency-vision-cache.ts](../lib/saliency-vision-cache.ts) – `setVisionRegions`, `getVisionRegions` (TTL 15 Min).
- **Integration SUM:** [app/api/saliency/result/route.ts](../app/api/saliency/result/route.ts) – nach Erhalt der Heatmap Fusion mit pageIndex und gecachten Vision-Regionen; Scanpath-Berechnung.
- **Integration AI:** [app/api/saliency/generate/route.ts](../app/api/saliency/generate/route.ts) – AI-Heatmap wird mit pageIndex fusioniert; optional im SUM-Pfad Fire-and-Forget Vision-Aufruf und Cache-Schreiben; Scanpath nach Fusion.

## Tests

- Nach `npm install`: `npm run test:saliency-fusion` bzw. `npx tsx lib/saliency-fusion.test.ts` – Unit-Tests für Structure-Map, Vision-Map, Decode/Encode-Roundtrip und `fuseSaliencyHeatmap`.
- `npm run test:scanpath` bzw. `npx tsx lib/scanpath.test.ts` – Unit-Tests für `computeScanpath` (Peaks, IoR, Reihenfolge).
