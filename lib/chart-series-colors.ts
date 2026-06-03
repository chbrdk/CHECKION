/**
 * Distinct colors for multi-series Recharts (GEO position, rank tracking, competitive).
 * Avoids modulo collisions on small palettes when many competitors/models are shown.
 */

/** High-contrast palette (hue-separated, not brand-green heavy). */
export const CHART_SERIES_PALETTE = [
    '#2563eb',
    '#dc2626',
    '#7c3aed',
    '#d97706',
    '#0891b2',
    '#db2777',
    '#4f46e5',
    '#ca8a04',
    '#059669',
    '#ea580c',
    '#9333ea',
    '#0d9488',
    '#e11d48',
    '#65a30d',
    '#c026d3',
    '#475569',
] as const;

const GOLDEN_ANGLE_DEG = 137.508;

/** Stable color for series index 0..n (no wrap until palette exhausted, then golden-angle HSL). */
export function getChartSeriesColor(seriesIndex: number): string {
    if (seriesIndex < 0) return CHART_SERIES_PALETTE[0];
    if (seriesIndex < CHART_SERIES_PALETTE.length) {
        return CHART_SERIES_PALETTE[seriesIndex];
    }
    const hue = (seriesIndex * GOLDEN_ANGLE_DEG) % 360;
    return `hsl(${Math.round(hue)}, 72%, 42%)`;
}

/** Map each key to a unique color; optional highlight key uses accent CSS variable. */
export function buildSeriesColorMap(
    keys: readonly string[],
    options?: { highlightKey?: string; highlightColor?: string }
): Map<string, string> {
    const map = new Map<string, string>();
    let paletteIndex = 0;
    for (const key of keys) {
        if (options?.highlightKey && key === options.highlightKey) {
            map.set(key, options.highlightColor ?? CHART_SERIES_PALETTE[0]);
        } else {
            map.set(key, getChartSeriesColor(paletteIndex));
            paletteIndex += 1;
        }
    }
    return map;
}
