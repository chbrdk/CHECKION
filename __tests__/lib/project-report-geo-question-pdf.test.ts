import { describe, it, expect } from 'vitest';
import {
    formatGeoAvgPosition,
    formatGeoPosition,
    geoPositionColor,
    geoTrendColor,
    geoTrendSymbol,
} from '@/lib/project-report/geo-question-pdf';

describe('geo-question-pdf helpers', () => {
    it('formats positions and avg position', () => {
        expect(formatGeoPosition(1)).toBe('#1');
        expect(formatGeoPosition(null)).toBe('–');
        expect(formatGeoAvgPosition(1.2)).toBe('1.2');
        expect(formatGeoAvgPosition(2)).toBe('2');
    });

    it('maps trend and rank colors', () => {
        expect(geoTrendColor('improving')).toBe('#059669');
        expect(geoTrendColor('declining')).toBe('#DC2626');
        expect(geoTrendColor('stable')).toBe('#2563EB');
        expect(geoPositionColor(1)).toBe('#059669');
        expect(geoPositionColor(3)).toBe('#2563EB');
        expect(geoPositionColor(8)).toBe('#D97706');
        expect(geoPositionColor(null)).toBe('#9CA3AF');
    });

    it('uses trend symbols', () => {
        expect(geoTrendSymbol('improving')).toBe('↑');
        expect(geoTrendSymbol('declining')).toBe('↓');
        expect(geoTrendSymbol('stable')).toBe('→');
        expect(geoTrendSymbol('unknown')).toBe('·');
    });
});
