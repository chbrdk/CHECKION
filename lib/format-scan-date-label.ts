/**
 * Long-form scan date for UI strings (e.g. card subtitles).
 * Uses UTC so Node SSR and browser hydration produce the same text for ISO timestamps.
 */
export function formatScanDateLabelUtc(timestamp: string, locale: 'en' | 'de'): string {
    return new Date(timestamp).toLocaleDateString(locale === 'en' ? 'en-US' : 'de-DE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    });
}
