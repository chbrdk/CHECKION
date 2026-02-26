/**
 * Saliency fusion: combine SUM (or AI) heatmap with DOM/structure (pageIndex)
 * and optional LLM Vision regions. All fusion in app layer; configurable weights.
 */

import sharp from 'sharp';
import type { PageIndex } from '@/lib/types';
import type { AttentionRegion } from '@/lib/saliency-ai';

const SEMANTIC_BOOST_HERO_NAV = 1.2;
const ABOVE_FOLD_BOOST = 1.1;
/** Higher default so DOM elements (nav, hero, headings) are clearly visible next to SUM. */
const DEFAULT_STRUCTURE_WEIGHT = 0.45;
const DEFAULT_VISION_WEIGHT = 0.2;
const FUSION_GAMMA = 0.4;

/** Jet colormap: 0 = blue, 0.5 = green, 1 = red (match Python/saliency-ai). */
function jetRgb(t: number): [number, number, number] {
    const x = Math.max(0, Math.min(1, t));
    const r = Math.round(255 * Math.max(0, Math.min(1, 1.5 - 4 * Math.abs(x - 0.75))));
    const g = Math.round(255 * Math.max(0, Math.min(1, 1.5 - 4 * Math.abs(x - 0.5))));
    const b = Math.round(255 * Math.max(0, Math.min(1, 1.5 - 4 * Math.abs(x - 0.25))));
    return [r, g, b];
}

/**
 * Build a structure attention map from pageIndex: fill each region's rect with attention
 * (position and size from DOM). Weight = findabilityScore * semanticBoost * (aboveFold ? 1.1 : 1).
 * Normalized to [0,1]. Rect coordinates are in the same space as the screenshot/heatmap.
 */
export function buildStructureAttentionMap(
    pageIndex: PageIndex,
    width: number,
    height: number
): Float32Array {
    const w = Math.max(1, Math.min(4096, width));
    const h = Math.max(1, Math.min(4096, height));
    const size = w * h;
    const map = new Float32Array(size);

    for (const r of pageIndex.regions) {
        if (!r.rect) continue;
        const rect = r.rect;
        let weight = r.findabilityScore * (r.aboveFold ? ABOVE_FOLD_BOOST : 1);
        if (r.semanticType === 'hero' || r.semanticType === 'nav') weight *= SEMANTIC_BOOST_HERO_NAV;

        const x0 = Math.max(0, Math.floor(rect.x));
        const x1 = Math.min(w, Math.ceil(rect.x + rect.width));
        const y0 = Math.max(0, Math.floor(rect.y));
        const y1 = Math.min(h, Math.ceil(rect.y + rect.height));

        for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
                map[y * w + x] += weight;
            }
        }
    }

    let maxVal = 0;
    for (let i = 0; i < size; i++) if (map[i] > maxVal) maxVal = map[i];
    if (maxVal > 0) {
        for (let i = 0; i < size; i++) map[i] /= maxVal;
    }
    return map;
}

/**
 * Build vision prior map from LLM attention regions (Gaussian blobs, same logic as saliency-ai).
 * Returns Float32Array normalized to [0,1].
 */
export function buildVisionPriorMap(
    regions: AttentionRegion[],
    width: number,
    height: number
): Float32Array {
    const w = Math.max(1, Math.min(4096, width));
    const h = Math.max(1, Math.min(4096, height));
    const size = w * h;
    const map = new Float32Array(size);

    for (const r of regions) {
        const cx = ((r.left_pct + r.width_pct / 2) / 100) * w;
        const cy = ((r.top_pct + r.height_pct / 2) / 100) * h;
        const sigma = (Math.min(r.width_pct, r.height_pct) / 100) * Math.min(w, h) * 0.35;
        const sigma2 = 2 * sigma * sigma;
        const amp = r.importance / 10;

        const x0 = Math.max(0, Math.floor(cx - sigma * 3));
        const x1 = Math.min(w, Math.ceil(cx + sigma * 3));
        const y0 = Math.max(0, Math.floor(cy - sigma * 3));
        const y1 = Math.min(h, Math.ceil(cy + sigma * 3));

        for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
                const dx = x - cx;
                const dy = y - cy;
                map[y * w + x] += amp * Math.exp(-(dx * dx + dy * dy) / sigma2);
            }
        }
    }

    let maxVal = 0;
    for (let i = 0; i < size; i++) if (map[i] > maxVal) maxVal = map[i];
    if (maxVal > 0) {
        for (let i = 0; i < size; i++) map[i] /= maxVal;
    }
    return map;
}

/**
 * Decode a Jet-colored PNG heatmap to a single intensity channel (R = heat).
 */
export async function decodeJetPngToIntensity(pngBuffer: Buffer): Promise<{
    intensity: Float32Array;
    width: number;
    height: number;
}> {
    const { data, info } = await sharp(pngBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    const size = width * height;
    const intensity = new Float32Array(size);
    const arr = new Uint8Array(data);
    for (let i = 0; i < size; i++) {
        intensity[i] = arr[i * channels] / 255; // R channel
    }
    return { intensity, width, height };
}

/**
 * Encode float intensity [0,1] to Jet PNG (with optional gamma). Returns PNG buffer.
 */
export async function intensityToJetPng(
    intensity: Float32Array,
    width: number,
    height: number
): Promise<Buffer> {
    const size = width * height;
    const rgb = Buffer.alloc(size * 3);
    for (let i = 0; i < size; i++) {
        let v = Math.max(0, Math.min(1, intensity[i]));
        v = Math.pow(v, FUSION_GAMMA);
        const [r, g, b] = jetRgb(v);
        rgb[i * 3] = r;
        rgb[i * 3 + 1] = g;
        rgb[i * 3 + 2] = b;
    }
    return sharp(rgb, {
        raw: { width, height, channels: 3 },
    })
        .png()
        .toBuffer();
}

export interface FuseSaliencyOptions {
    sumHeatmapPngBase64: string;
    pageIndex?: PageIndex;
    structureWeight?: number;
    visionRegions?: AttentionRegion[];
    visionWeight?: number;
    width: number;
    height: number;
}

/**
 * Fuse SUM (or AI) heatmap with optional structure map and optional vision prior.
 * Returns base64 PNG string.
 */
export async function fuseSaliencyHeatmap(options: FuseSaliencyOptions): Promise<string> {
    const {
        sumHeatmapPngBase64,
        pageIndex,
        structureWeight = DEFAULT_STRUCTURE_WEIGHT,
        visionRegions,
        visionWeight = DEFAULT_VISION_WEIGHT,
        width,
        height,
    } = options;

    const raw = sumHeatmapPngBase64.trim().replace(/^data:[^;]+;base64,/, '');
    const pngBuffer = Buffer.from(raw, 'base64');
    const { intensity, width: w, height: h } = await decodeJetPngToIntensity(pngBuffer);

    let combined = intensity;

    if (pageIndex && structureWeight > 0) {
        const structureMap = buildStructureAttentionMap(pageIndex, w, h);
        for (let i = 0; i < combined.length; i++) {
            combined[i] = combined[i] + structureWeight * structureMap[i];
        }
    }

    if (visionRegions?.length && visionWeight > 0) {
        const visionMap = buildVisionPriorMap(visionRegions, w, h);
        for (let i = 0; i < combined.length; i++) {
            combined[i] = combined[i] + visionWeight * visionMap[i];
        }
    }

    let maxVal = 0;
    for (let i = 0; i < combined.length; i++) if (combined[i] > maxVal) maxVal = combined[i];
    if (maxVal > 0) {
        for (let i = 0; i < combined.length; i++) {
            combined[i] = Math.min(1, combined[i] / maxVal);
        }
    }

    const outPng = await intensityToJetPng(combined, w, h);
    return outPng.toString('base64');
}
