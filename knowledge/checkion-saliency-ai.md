# KI-Heatmap (OpenAI Vision)

Statt des SUM-Saliency-Modells kann CHECKION eine **KI-basierte Aufmerksamkeits-Heatmap** erzeugen.

## Aktivierung

- **Env:** `SALIENCY_USE_AI=true` (oder `1`) und `OPENAI_API_KEY` gesetzt.
- Optional: `OPENAI_SALIENCY_MODEL` (Standard: `gpt-5-mini`) – muss Vision unterstützen.

## Ablauf

1. **POST /api/saliency/generate** mit `scanId`.
2. Wenn `SALIENCY_USE_AI` gesetzt: Screenshot wird an OpenAI Vision geschickt.
3. **Prompt:** Das Modell liefert eine JSON-Liste von **Aufmerksamkeits-Regionen** (headlines, CTAs, Bilder, Nav) mit `top_pct`, `left_pct`, `width_pct`, `height_pct`, `importance` (1–10).
4. **Rendering:** Aus den Regionen wird eine Heatmap gebaut (Gaussian-Blobs pro Region, Jet-Colormap). Kein SUM, kein separater Container.
5. Antwort: `{ success: true }` – der Client aktualisiert den Scan und zeigt die Heatmap (kein Polling).

## Code

- **Lib:** `lib/saliency-ai.ts` – `getAttentionRegionsFromVision()`, `renderHeatmapFromRegions()`.
- **Route:** `app/api/saliency/generate/route.ts` – wenn `USE_AI_SALIENCY && OPENAI_API_KEY`, AI-Pfad; sonst SUM-Job.

## Vor-/Nachteile

- **Vorteile:** Kein SUM-Container nötig, oft klarere Hotspots (Headlines, Buttons, Bilder), schneller (kein langes CPU-Modell).
- **Nachteile:** Kosten pro Aufruf (OpenAI API), Abhängigkeit von Prompt/Modell; bei sehr langen Seiten evtl. weniger Regionen.
