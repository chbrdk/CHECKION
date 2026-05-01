/** Normalize tags / industry for projects and domain scans (filtering + storage). */

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
