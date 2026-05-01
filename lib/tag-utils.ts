/** Normalize tags / industry for projects and domain scans (filtering + storage). */

import type { AggregatedPageClassification, PageClassification } from '@/lib/types';

export const MAX_TAGS_PER_ENTITY = 32;
export const MAX_TAG_LEN = 48;
export const MAX_INDUSTRY_LEN = 128;

const TAG_RE = /^[\w-]+$/;

/** Single tag for URL/query filters; lowercase alphanumeric + hyphen. */
export function normalizeTagFilter(raw: string | undefined): string | null {
    if (!raw?.trim()) return null;
    const s = raw.trim().toLowerCase().slice(0, MAX_TAG_LEN);
    if (!TAG_RE.test(s)) return null;
    return s;
}

/** Stored tag list: dedupe, lowercase, max length/count. */
export function normalizeTagList(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const x of raw) {
        if (typeof x !== 'string') continue;
        const t = normalizeTagFilter(x);
        if (!t || seen.has(t)) continue;
        seen.add(t);
        out.push(t);
        if (out.length >= MAX_TAGS_PER_ENTITY) break;
    }
    return out;
}

/** Parse comma- or newline-separated input from UI into normalized tags. */
export function parseTagsFromInput(raw: string): string[] {
    const parts = raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    return normalizeTagList(parts);
}

export function normalizeIndustry(raw: string | null | undefined): string | null {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    return s.slice(0, MAX_INDUSTRY_LEN);
}

export function coerceJsonStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return normalizeTagList(value);
}

/** Slug `aggregated.pageClassification.topThemes` keys into stored filter tags (deduped, capped). */
export function rollupThemesToProjectTags(
    pc: AggregatedPageClassification | null | undefined,
    maxTags = 12,
): string[] {
    const top = pc?.topThemes ?? [];
    const candidates: string[] = [];
    for (const th of top) {
        const raw = (th.themeTagKey ?? th.tag ?? '').trim();
        if (!raw) continue;
        const slug = raw
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9_-]+/g, '')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, MAX_TAG_LEN);
        const t = normalizeTagFilter(slug);
        if (t) candidates.push(t);
    }
    return normalizeTagList(candidates).slice(0, maxTags);
}

/** Single-page `classifyPageWithLlm` output → project filter tags (tier-high first). */
export function rollupTagTiersToProjectTags(
    pc: PageClassification | null | undefined,
    maxTags = 12
): string[] {
    if (!pc?.tagTiers?.length) return [];
    const sorted = [...pc.tagTiers].sort(
        (a, b) => b.tier - a.tier || a.tag.localeCompare(b.tag)
    );
    const candidates: string[] = [];
    for (const t of sorted) {
        const raw = (t.tag ?? '').trim();
        if (!raw) continue;
        const slug = raw
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9_-]+/g, '')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, MAX_TAG_LEN);
        const norm = normalizeTagFilter(slug);
        if (norm) candidates.push(norm);
    }
    return normalizeTagList(candidates).slice(0, maxTags);
}
