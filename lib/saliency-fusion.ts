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
/** Weight for contrast-based attention (element vs background luminance difference). */
const DEFAULT_CONTRAST_WEIGHT = 0.25;
const FUSION_GAMMA = 0.4;

/** Relative luminance (sRGB) for a single pixel. */
function luminance(R: number, G: number, B: number): number {
    return 0.299 * R + 0.587 * G + 0.114 * B;
}

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
 * Build a contrast-based attention map from the screenshot: for each pageIndex region,
 * sample mean luminance inside the rect and in a 2px border around it; compute
 * relative contrast (Michelson-style: (L_max - L_min) / (L_max + L_min + eps)).
 * High-contrast elements (e.g. text on background, CTAs) get higher values.
 * Returns Float32Array [0,1] same size as image; regions without rect or too small are skipped.
 */
export async function buildContrastAttentionMap(
    imageBuffer: Buffer,
    pageIndex: PageIndex,
    width: number,
    height: number
): Promise<Float32Array> {
    const w = Math.max(1, Math.min(4096, width));
    const h = Math.max(1, Math.min(4096, height));
    const size = w * h;
    const map = new Float32Array(size);

    let raw: Buffer;
    let imgW: number;
    let imgH: number;
    let channels: number;
    try {
        const result = await sharp(imageBuffer)
            .raw()
            .toBuffer({ resolveWithObject: true });
        raw = result.data;
        imgW = result.info.width ?? w;
        imgH = result.info.height ?? h;
        channels = result.info.channels ?? 3;
    } catch {
        return map;
    }

    const getL = (x: number, y: number): number => {
        if (x < 0 || x >= imgW || y < 0 || y >= imgH) return NaN;
        const i = (y * imgW + x) * channels;
        return luminance(raw[i], raw[i + 1], raw[i + 2]);
    };

    for (const r of pageIndex.regions) {
        if (!r.rect) continue;
        const { x: rx, y: ry, width: rw, height: rh } = r.rect;
        const x0 = Math.max(0, Math.floor(rx));
        const x1 = Math.min(imgW, Math.ceil(rx + rw));
        const y0 = Math.max(0, Math.floor(ry));
        const y1 = Math.min(imgH, Math.ceil(ry + rh));
        if (x1 <= x0 + 1 || y1 <= y0 + 1) continue;

        let sumL = 0;
        let count = 0;
        for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
                const L = getL(x, y);
                if (!Number.isNaN(L)) {
                    sumL += L;
                    count++;
                }
            }
        }
        const LInside = count > 0 ? sumL / count : 0;

        const borderPad = 2;
        const bx0 = Math.max(0, x0 - borderPad);
        const bx1 = Math.min(imgW, x1 + borderPad);
        const by0 = Math.max(0, y0 - borderPad);
        const by1 = Math.min(imgH, y1 + borderPad);
        let borderSum = 0;
        let borderCount = 0;
        for (let y = by0; y < by1; y++) {
            for (let x = bx0; x < bx1; x++) {
                const inInner = x >= x0 && x < x1 && y >= y0 && y < y1;
                if (inInner) continue;
                const L = getL(x, y);
                if (!Number.isNaN(L)) {
                    borderSum += L;
                    borderCount++;
                }
            }
        }
        const LBorder = borderCount > 0 ? borderSum / borderCount : LInside;
        const LMax = Math.max(LInside, LBorder);
        const LMin = Math.min(LInside, LBorder);
        const contrast = LMax + LMin > 1e-3 ? (LMax - LMin) / (LMax + LMin + 1e-6) : 0;

        const outX0 = Math.max(0, Math.floor(rx));
        const outX1 = Math.min(w, Math.ceil(rx + rw));
        const outY0 = Math.max(0, Math.floor(ry));
        const outY1 = Math.min(h, Math.ceil(ry + rh));
        for (let y = outY0; y < outY1; y++) {
            for (let x = outX0; x < outX1; x++) {
                map[y * w + x] = Math.max(map[y * w + x], contrast);
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

/** Rect + score for MediaPipe (face/gaze) or other detectors; pixel coordinates. */
export interface MediaPipeRect {
    rect: { x: number; y: number; width: number; height: number };
    score: number;
}

/**
 * Build a prior map from MediaPipe-style rects (e.g. face/gaze detection). Gaussian at center, normalized [0,1].
 */
export function buildMediaPipePriorMap(
    rects: MediaPipeRect[],
    width: number,
    height: number
): Float32Array {
    const w = Math.max(1, Math.min(4096, width));
    const h = Math.max(1, Math.min(4096, height));
    const size = w * h;
    const map = new Float32Array(size);
    for (const r of rects) {
        const rect = r.rect;
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;
        const sigma = Math.min(rect.width, rect.height) * 0.4;
        const sigma2 = 2 * sigma * sigma;
        const amp = Math.min(1, r.score);
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
    /** Optional: MediaPipe face/gaze or other detector rects (pixel coords). */
    mediaPipeRects?: MediaPipeRect[];
    mediaPipeWeight?: number;
    width: number;
    height: number;
}

export interface RenderStructureOnlyOptions {
    pageIndex: PageIndex;
    width: number;
    height: number;
    structureWeight?: number;
    visionRegions?: AttentionRegion[];
    visionWeight?: number;
    /** Screenshot buffer for contrast-based attention (element vs background). */
    imageBuffer?: Buffer;
    contrastWeight?: number;
}

/**
 * Build a heatmap from structure (pageIndex) only, no SUM. Covers the full page.
 * Optionally adds vision prior and/or contrast-based attention from the screenshot.
 * Returns base64 PNG string.
 */
export async function renderStructureOnlyHeatmap(options: RenderStructureOnlyOptions): Promise<string> {
    const {
        pageIndex,
        width,
        height,
        structureWeight = 1,
        visionRegions,
        visionWeight = DEFAULT_VISION_WEIGHT,
        imageBuffer,
        contrastWeight = DEFAULT_CONTRAST_WEIGHT,
    } = options;

    const w = Math.max(1, Math.min(4096, width));
    const h = Math.max(1, Math.min(4096, height));
    const size = w * h;

    const structureMap = buildStructureAttentionMap(pageIndex, w, h);
    let combined = new Float32Array(size);
    for (let i = 0; i < size; i++) combined[i] = structureWeight * structureMap[i];

    if (visionRegions?.length && visionWeight > 0) {
        const visionMap = buildVisionPriorMap(visionRegions, w, h);
        for (let i = 0; i < size; i++) combined[i] += visionWeight * visionMap[i];
    }

    if (imageBuffer && contrastWeight > 0 && pageIndex.regions?.length) {
        try {
            const contrastMap = await buildContrastAttentionMap(imageBuffer, pageIndex, w, h);
            for (let i = 0; i < size; i++) combined[i] += contrastWeight * contrastMap[i];
        } catch (e) {
            // ignore contrast failure (e.g. image decode)
        }
    }

    let maxVal = 0;
    for (let i = 0; i < size; i++) if (combined[i] > maxVal) maxVal = combined[i];
    if (maxVal > 0) {
        for (let i = 0; i < size; i++) combined[i] = Math.min(1, combined[i] / maxVal);
    }

    const outPng = await intensityToJetPng(combined, w, h);
    return outPng.toString('base64');
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
        mediaPipeRects,
        mediaPipeWeight = 0.15,
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

    if (mediaPipeRects?.length && mediaPipeWeight > 0) {
        const mediaMap = buildMediaPipePriorMap(mediaPipeRects, w, h);
        for (let i = 0; i < combined.length; i++) {
            combined[i] = combined[i] + mediaPipeWeight * mediaMap[i];
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
