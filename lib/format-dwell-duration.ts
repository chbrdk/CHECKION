/**
 * Human-readable dwell-time strings (scan model, not analytics).
 */

export type DwellLocale = 'de' | 'en';

export function formatDwellSeconds(seconds: number, locale: DwellLocale = 'de'): string {
    const s = Math.max(0, Math.round(seconds));
    if (locale === 'en') {
        if (s < 60) return `${s}s`;
        const m = Math.floor(s / 60);
        const r = s % 60;
        if (r === 0) return `${m} min`;
        return `${m} min ${r}s`;
    }
    if (s < 60) return `${s} Sek.`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (r === 0) return `${m} Min.`;
    return `${m} Min. ${r} Sek.`;
}

export function formatDwellRange(minSeconds: number, maxSeconds: number, locale: DwellLocale = 'de'): string {
    return `${formatDwellSeconds(minSeconds, locale)} – ${formatDwellSeconds(maxSeconds, locale)}`;
}
