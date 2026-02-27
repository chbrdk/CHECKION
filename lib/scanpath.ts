/**
 * Scanpath heuristic: estimate gaze order from saliency heatmap + DOM (pageIndex).
 * No ML – local maxima, F-pattern position weight, inhibition-of-return.
 */

import { decodeJetPngToIntensity } from '@/lib/saliency-fusion';
import type { PageIndex, ScanpathFixation } from '@/lib/types';

const DEFAULT_MAX_FIXATIONS = 8;
const DEFAULT_IOR_RADIUS = 100;
const PEAK_WINDOW = 5; // 5×5 local max
const PEAK_THRESHOLD = 0.1;
const POSITION_DECAY = 0.3; // F-pattern: top bias

function positionWeight(y: number, height: number): number {
    return 1 / (1 + POSITION_DECAY * (y / Math.max(1, height)));
}

function findContainingRegion(
    x: number,
    y: number,
    pageIndex: PageIndex
): { regionId: string; area: number } | undefined {
    for (const r of pageIndex.regions) {
        if (!r.rect) continue;
        const { x: rx, y: ry, width: rw, height: rh } = r.rect;
        if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) {
            return { regionId: r.id, area: rw * rh };
        }
    }
    return undefined;
}

function sizeWeight(area: number): number {
    return Math.log(1 + area);
}

/** Find local maxima in intensity map (PEAK_WINDOW×PEAK_WINDOW), above PEAK_THRESHOLD. */
function findPeaks(
    intensity: Float32Array,
    width: number,
    height: number
): Array<{ x: number; y: number; saliency: number }> {
    const half = Math.floor(PEAK_WINDOW / 2);
    const peaks: Array<{ x: number; y: number; saliency: number }> = [];
    for (let y = half; y < height - half; y++) {
        for (let x = half; x < width - half; x++) {
            const idx = y * width + x;
            const v = intensity[idx];
            if (v < PEAK_THRESHOLD) continue;
            let isMax = true;
            for (let dy = -half; dy <= half && isMax; dy++) {
                for (let dx = -half; dx <= half && isMax; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const ni = (y + dy) * width + (x + dx);
                    if (intensity[ni] > v) isMax = false;
                }
            }
            if (isMax) peaks.push({ x, y, saliency: v });
        }
    }
    return peaks;
}

/** Apply inhibition-of-return: reduce intensity in radius around (cx, cy). */
function applyIoR(
    intensity: Float32Array,
    width: number,
    height: number,
    cx: number,
    cy: number,
    radius: number
): void {
    const r2 = radius * radius;
    const y0 = Math.max(0, Math.floor(cy - radius));
    const y1 = Math.min(height, Math.ceil(cy + radius + 1));
    const x0 = Math.max(0, Math.floor(cx - radius));
    const x1 = Math.min(width, Math.ceil(cx + radius + 1));
    for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
            const dx = x - cx;
            const dy = y - cy;
            if (dx * dx + dy * dy <= r2) {
                const idx = y * width + x;
                intensity[idx] *= 0.2; // decay
            }
        }
    }
}

export interface ComputeScanpathOptions {
    heatmapPngBase64: string;
    pageIndex: PageIndex;
    width: number;
    height: number;
    maxFixations?: number;
    iorRadius?: number;
}

/**
 * Compute estimated scanpath (fixation order) from fused saliency heatmap and pageIndex.
 * Uses local maxima, F-pattern position weight, region size weight, and inhibition-of-return.
 */
export async function computeScanpath(options: ComputeScanpathOptions): Promise<ScanpathFixation[]> {
    const {
        heatmapPngBase64,
        pageIndex,
        width,
        height,
        maxFixations = DEFAULT_MAX_FIXATIONS,
        iorRadius = DEFAULT_IOR_RADIUS,
    } = options;

    let raw = heatmapPngBase64.trim();
    if (raw.startsWith('data:')) {
        const comma = raw.indexOf(',');
        raw = comma >= 0 ? raw.slice(comma + 1) : '';
    }
    if (!raw) return [];

    const pngBuffer = Buffer.from(raw, 'base64');
    const { intensity, width: w, height: h } = await decodeJetPngToIntensity(pngBuffer);
    if (w !== width || h !== height) {
        // Dimensions should match; use decoded dimensions if caller passed wrong ones
    }
    const W = w;
    const H = h;

    const peaks = findPeaks(intensity, W, H);
    if (peaks.length === 0) return [];

    const intensityCopy = new Float32Array(intensity);
    const result: ScanpathFixation[] = [];
    const used = new Set<string>();

    for (let order = 0; order < maxFixations; order++) {
        let best: { x: number; y: number; saliency: number; regionId?: string; sizeW: number } | null = null;
        let bestScore = -1;

        for (const p of peaks) {
            const key = `${p.x},${p.y}`;
            if (used.has(key)) continue;
            const saliency = intensityCopy[p.y * W + p.x];
            if (saliency < PEAK_THRESHOLD) continue;
            const posW = positionWeight(p.y, H);
            const region = findContainingRegion(p.x, p.y, pageIndex);
            const sizeW = region ? sizeWeight(region.area) : 1;
            const score = saliency * posW * sizeW;
            if (score > bestScore) {
                bestScore = score;
                best = {
                    x: p.x,
                    y: p.y,
                    saliency,
                    regionId: region?.regionId,
                    sizeW,
                };
            }
        }

        if (!best) break;
        used.add(`${best.x},${best.y}`);
        result.push({
            x: best.x,
            y: best.y,
            order: result.length + 1,
            regionId: best.regionId,
            saliency: best.saliency,
        });
        applyIoR(intensityCopy, W, H, best.x, best.y, iorRadius);
    }

    return result;
}
