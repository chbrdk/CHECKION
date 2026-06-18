# MSQDX PPT Master — Layout Mapping

**Master file:** `assets/report-templates/MSQDX_PPT-Master_27-05-26.pptx`  
**Logos:** `assets/report-templates/PNG/MSQDX_Logotype_White.png`, `MSQDX_Logotype_Black.png`  
**Stand:** 2026-06-17

## Theme (extracted from `theme1.xml`)

| Token | Hex |
|-------|-----|
| accent1 (primary) | `#F256B6` |
| accent2 | `#FEF14D` |
| accent3 | `#00CA55` |
| accent4 | `#FF693B` |
| accent5 (surface) | `#EAE8E8` |
| accent6 (muted) | `#716E6B` |

## Semantic → Master layout names

The corporate master uses descriptive layout names (not `MSQDX_*`). CHECKION maps semantic slide types to these layouts for future **pptx-automizer** template mode:

| Semantic (`PPTX_LAYOUT`) | Master layout name | `slideLayout` file |
|--------------------------|-------------------|-------------------|
| `TITLE` | Hero 2 (BK) | slideLayout3.xml |
| `SECTION` | Divider (BK) | slideLayout11.xml |
| `CONTENT` | Text only (BK) | slideLayout15.xml |
| `TWO_COLUMN` | Text only 2 columns (BK) | slideLayout20.xml |
| `METRICS` | Text on 3 tiles (BK) | slideLayout29.xml |
| `CLOSING` | Quote (black) | slideLayout43.xml |

## Placeholders (standard OOXML types)

The master uses German default placeholder names. Map by **type**, not custom names:

| Type | Typical shape name | Use |
|------|-------------------|-----|
| `title` | Titel 1 / Titelplatzhalter 7 | Slide title |
| `body` | Text Placeholder 4 | Bullets / body |
| `ftr` | Fußzeilenplatzhalter | Footer (project + date) |
| `sldNum` | Foliennummernplatzhalter | Slide number |

## Renderer strategy

**Primary:** `pptx-automizer` clones slides from `MSQDX_PPT-Master_27-05-26.pptx` by layout (`PPTX_MSQDX_TEMPLATE_SLIDES` in `lib/paths/report-export-templates.ts`). Placeholders are filled via `modify.setText` / `setMultiText`; layouts named `*(BK)` get **white** body/title text (`pptx-automizer-text-style.ts`). Charts use light axis/legend labels on black slides.

**Fallback:** If the master file is missing (e.g. local dev without assets), `render-pptx.ts` falls back to PptxGenJS `defineSlideMaster()` in `pptx-masters.ts`.

## Text zones & budgets (`pptx-content-budget.ts`)

Calibrated from placeholder bounding boxes in `MSQDX_PPT-Master_27-05-26.pptx` (see `assets/report-templates/msqdx-ppt-zone-calibration.json`). Re-extract with `extract-msqdx-ppt-zones.ts` when the master changes.

**CONTENT layout (inches, measured):**

| Zone | Position (y → bottom) | Size (w × h) | Budget |
|------|----------------------|--------------|--------|
| eyebrow (`idx=12`) | 0.367 → 0.603 | 7.165 × 0.236 | 1 line × 63 chars @ 14pt |
| title (master) | 0.608 → 1.832 | 10.241 × 1.224 | 2 lines × 39 chars |
| body (`idx=1`) | 2.023 → 7.004 | 10.239 × 4.981 | 6 bullets × 91 chars |
| footer | from 7.264 | — | — |
| chart overlay | starts 2.023 | 10.239 wide | max ~4.57" with 2 bullets |

`normalizePptxPlan()` fits copy to these zones; overflow becomes `— Kontext` / `(Forts.)` slides. `computeChartLayout()` uses the same geometry as `render-pptx-automizer.ts`.
