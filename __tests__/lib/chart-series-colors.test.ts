import { describe, expect, it } from 'vitest';
import {
    CHART_SERIES_PALETTE,
    buildSeriesColorMap,
    getChartSeriesColor,
} from '@/lib/chart-series-colors';

describe('getChartSeriesColor', () => {
    it('returns palette colors for low indices without repeating early entries', () => {
        const a = getChartSeriesColor(0);
        const b = getChartSeriesColor(1);
        expect(a).not.toBe(b);
        expect(CHART_SERIES_PALETTE).toContain(a);
        expect(CHART_SERIES_PALETTE).toContain(b);
    });

    it('returns distinct hsl colors beyond palette length', () => {
        const i16 = getChartSeriesColor(16);
        const i17 = getChartSeriesColor(17);
        expect(i16).toMatch(/^hsl\(/);
        expect(i17).toMatch(/^hsl\(/);
        expect(i16).not.toBe(i17);
    });
});

describe('buildSeriesColorMap', () => {
    it('assigns unique colors per key and reserves highlight', () => {
        const map = buildSeriesColorMap(['ours.com', 'a.com', 'b.com'], {
            highlightKey: 'ours.com',
            highlightColor: 'var(--accent)',
        });
        expect(map.get('ours.com')).toBe('var(--accent)');
        const others = ['a.com', 'b.com'].map((k) => map.get(k));
        expect(new Set(others).size).toBe(2);
        expect(others[0]).not.toBe('var(--accent)');
        expect(others[1]).not.toBe('var(--accent)');
        expect(others[0]).not.toBe(others[1]);
    });
});
