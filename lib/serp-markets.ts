/**
 * Main markets for SERP rank tracking (Serper gl/hl).
 * Country (gl) and language (hl) are always set for consistent results.
 * Used for validation and UI dropdowns.
 */
export const SERP_MAIN_MARKETS = [
    { country: 'de', language: 'de', label: 'Deutschland' },
    { country: 'at', language: 'de', label: 'Österreich' },
    { country: 'ch', language: 'de', label: 'Schweiz (DE)' },
    { country: 'us', language: 'en', label: 'United States' },
    { country: 'gb', language: 'en', label: 'United Kingdom' },
    { country: 'fr', language: 'fr', label: 'France' },
    { country: 'es', language: 'es', label: 'Spain' },
    { country: 'it', language: 'it', label: 'Italy' },
    { country: 'nl', language: 'nl', label: 'Netherlands' },
] as const;

export type SerpMarket = (typeof SERP_MAIN_MARKETS)[number];

export const SERP_DEFAULT_COUNTRY = 'de';
export const SERP_DEFAULT_LANGUAGE = 'de';
/** Number of SERP pages to fetch per keyword (1–100); position is then 1–(numPages*~10). */
export const SERP_NUM_PAGES = 10;
/** Max organic results shown in the Google-style SERP preview modal (first results page). */
export const SERP_PREVIEW_DISPLAY_LIMIT = 10;

export function getMarketByCountryAndLanguage(country: string, language: string): SerpMarket | undefined {
    const c = country.toLowerCase().trim();
    const l = language.toLowerCase().trim();
    return SERP_MAIN_MARKETS.find((m) => m.country === c && m.language === l);
}

export function isValidCountryLanguage(country: string, language: string): boolean {
    return getMarketByCountryAndLanguage(country, language) !== undefined;
}

/** Stable key for maps/UI, e.g. `de-de`, `us-en`. */
export function marketKey(country: string, language: string): string {
    return `${country.toLowerCase().trim()}-${language.toLowerCase().trim()}`;
}

export function parseMarketKey(key: string): { country: string; language: string } | undefined {
    const parts = key.toLowerCase().trim().split('-');
    if (parts.length !== 2 || parts[0].length !== 2 || parts[1].length !== 2) return undefined;
    const [country, language] = parts;
    return isValidCountryLanguage(country, language) ? { country, language } : undefined;
}

