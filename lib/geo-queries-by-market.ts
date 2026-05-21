/**
 * GEO queries stored per SERP market or as legacy flat string[].
 */

import { marketKey, parseMarketKey, SERP_DEFAULT_COUNTRY, SERP_DEFAULT_LANGUAGE } from '@/lib/serp-markets';

export type GeoQueriesByMarket = Record<string, string[]>;

export type GeoQueriesStorage = string[] | GeoQueriesByMarket;

const LEGACY_DEFAULT_MARKET = marketKey(SERP_DEFAULT_COUNTRY, SERP_DEFAULT_LANGUAGE);

function isByMarketObject(value: unknown): value is GeoQueriesByMarket {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.values(value as Record<string, unknown>).every(
        (v) => Array.isArray(v) && v.every((q) => typeof q === 'string')
    );
}

/** Normalize DB/json value to market-keyed map. */
export function normalizeGeoQueriesToByMarket(raw: unknown): GeoQueriesByMarket {
    if (Array.isArray(raw)) {
        const queries = raw.filter((q): q is string => typeof q === 'string' && q.trim().length > 0);
        if (queries.length === 0) return {};
        return { [LEGACY_DEFAULT_MARKET]: queries };
    }
    if (isByMarketObject(raw)) {
        const out: GeoQueriesByMarket = {};
        for (const [key, arr] of Object.entries(raw)) {
            const queries = arr.map((q) => q.trim()).filter(Boolean);
            if (queries.length > 0) out[key] = queries;
        }
        return out;
    }
    return {};
}

/** Flat list for GEO runs that still expect string[]. */
export function flattenGeoQueries(raw: unknown): string[] {
    const byMarket = normalizeGeoQueriesToByMarket(raw);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const arr of Object.values(byMarket)) {
        for (const q of arr) {
            const k = q.toLowerCase();
            if (!seen.has(k)) {
                seen.add(k);
                out.push(q);
            }
        }
    }
    return out;
}

export function mergeGeoQueriesByMarket(
    existing: unknown,
    additions: GeoQueriesByMarket
): GeoQueriesByMarket {
    const base = normalizeGeoQueriesToByMarket(existing);
    for (const [mk, queries] of Object.entries(additions)) {
        const prev = base[mk] ?? [];
        const seen = new Set(prev.map((q) => q.toLowerCase()));
        for (const q of queries) {
            const t = q.trim();
            if (!t) continue;
            const k = t.toLowerCase();
            if (!seen.has(k)) {
                seen.add(k);
                prev.push(t);
            }
        }
        base[mk] = prev;
    }
    return base;
}

export function geoQueriesForMarket(raw: unknown, country: string, language: string): string[] {
    const byMarket = normalizeGeoQueriesToByMarket(raw);
    return byMarket[marketKey(country, language)] ?? [];
}

export function parseMarketKeys(keys: string[]): { country: string; language: string }[] {
    const out: { country: string; language: string }[] = [];
    for (const k of keys) {
        const p = parseMarketKey(k);
        if (p) out.push(p);
    }
    return out;
}
