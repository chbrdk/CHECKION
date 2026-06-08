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

export function chunkPairs<T>(items: T[]): Array<[T, T | undefined]> {
    const pairs: Array<[T, T | undefined]> = [];
    for (let i = 0; i < items.length; i += 2) {
        pairs.push([items[i], items[i + 1]]);
    }
    return pairs;
}

export function splitIntoColumns<T>(items: T[], columns = 2): T[][] {
    const cols: T[][] = Array.from({ length: columns }, () => []);
    items.forEach((item, i) => {
        cols[i % columns].push(item);
    });
    return cols;
}

export function splitIndexedIntoColumns(
    items: string[],
    columns = 2
): Array<Array<{ domain: string; rank: number }>> {
    const cols: Array<Array<{ domain: string; rank: number }>> = Array.from(
        { length: columns },
        () => []
    );
    items.forEach((domain, i) => {
        cols[i % columns].push({ domain, rank: i + 1 });
    });
    return cols;
}
