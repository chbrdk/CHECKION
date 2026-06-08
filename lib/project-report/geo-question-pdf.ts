import type { GeoQuestionDetailFact } from '@/lib/project-report/types';

export type GeoTrendKey = GeoQuestionDetailFact['trend'];

export function geoTrendColor(trend: GeoTrendKey): string {
    switch (trend) {
        case 'improving':
            return '#059669';
        case 'declining':
            return '#DC2626';
        case 'stable':
            return '#2563EB';
        default:
            return '#9CA3AF';
    }
}

export function geoPositionColor(position: number | null): string {
    if (position == null) return '#9CA3AF';
    if (position <= 1) return '#059669';
    if (position <= 3) return '#2563EB';
    if (position <= 10) return '#D97706';
    return '#DC2626';
}

export function formatGeoPosition(position: number | null): string {
    if (position == null) return '–';
    return `#${position}`;
}

export function formatGeoAvgPosition(position: number | null): string {
    if (position == null) return '–';
    return Number.isInteger(position) ? String(position) : position.toFixed(1);
}

export function geoTrendSymbol(trend: GeoTrendKey): string {
    switch (trend) {
        case 'improving':
            return '↑';
        case 'declining':
            return '↓';
        case 'stable':
            return '→';
        default:
            return '·';
    }
}
