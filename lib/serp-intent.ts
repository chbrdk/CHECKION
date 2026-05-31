/**
 * Search intent grouping for multi-market rank tracking.
 */

import { marketKey, parseMarketKey, type SerpMarket } from '@/lib/serp-markets';

export interface RankKeywordIntentFields {
    intentKey?: string | null;
    intentLabel?: string | null;
    keyword: string;
    country: string;
    language: string;
}

export interface IntentKeywordGroup<T extends RankKeywordIntentFields> {
    intentKey: string;
    intentLabel: string;
    variants: T[];
}

/** Stable slug for grouping (ASCII, lowercase, hyphens). */
export function slugifyIntentKey(label: string): string {
    const base = label
        .trim()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return base.slice(0, 80) || 'intent';
}

export function deriveIntentKeyFromKeyword(keyword: string): string {
    return slugifyIntentKey(keyword);
}

export function resolveIntentFields(
    keyword: string,
    intentKey?: string | null,
    intentLabel?: string | null
): { intentKey: string; intentLabel: string } {
    const label = intentLabel?.trim() || keyword.trim();
    const key = intentKey?.trim() || slugifyIntentKey(label);
    return { intentKey: key, intentLabel: label };
}

export function groupKeywordsByIntent<T extends RankKeywordIntentFields>(
    keywords: T[]
): IntentKeywordGroup<T>[] {
    const map = new Map<string, IntentKeywordGroup<T>>();
    for (const k of keywords) {
        const { intentKey, intentLabel } = resolveIntentFields(k.keyword, k.intentKey, k.intentLabel);
        const existing = map.get(intentKey);
        if (existing) {
            existing.variants.push(k);
        } else {
            map.set(intentKey, { intentKey, intentLabel, variants: [k] });
        }
    }
    return [...map.values()].sort((a, b) => a.intentLabel.localeCompare(b.intentLabel, undefined, { sensitivity: 'base' }));
}

export function marketLabelForKeyword(country: string, language: string, markets: readonly SerpMarket[]): string {
    const key = marketKey(country, language);
    const m = markets.find((x) => marketKey(x.country, x.language) === key);
    return m?.label ?? `${country}/${language}`;
}

export { marketKey, parseMarketKey };
