/**
 * Base64url-encoded keyset cursors for domain slim-pages / seo-pages APIs.
 * Clients send `after=` only with matching sort/dir; server validates.
 */

import type { SlimSortKey } from '@/lib/db/domain-slim-pages';
import type { SeoPagesSortKey } from '@/lib/db/domain-seo-pages';

const CURSOR_VERSION = 1 as const;

export type SlimKeysetPayload = {
    v: typeof CURSOR_VERSION;
    t: 'slim';
    sort: SlimSortKey;
    dir: 'asc' | 'desc';
    /** Tie-breaker: domain_pages.id */
    id: string;
    /** Primary sort value (issues = integer sum; score = int; ux = coalesced ux score; url = string). */
    p: string | number;
};

export type SeoKeysetPayload = {
    v: typeof CURSOR_VERSION;
    t: 'seo';
    sort: SeoPagesSortKey;
    dir: 'asc' | 'desc';
    /** domain_pages.id — stable tie-breaker for keyset pagination */
    id: string;
    wordCount: number;
    url: string;
};

function toBase64Url(json: string): string {
    return Buffer.from(json, 'utf8').toString('base64url');
}

function fromBase64Url(s: string): string {
    return Buffer.from(s, 'base64url').toString('utf8');
}

export function encodeSlimKeysetCursor(payload: SlimKeysetPayload): string {
    return toBase64Url(JSON.stringify(payload));
}

export function encodeSeoKeysetCursor(payload: SeoKeysetPayload): string {
    return toBase64Url(JSON.stringify(payload));
}

export function decodeSlimKeysetCursor(
    raw: string,
    expectedSort: SlimSortKey,
    expectedDir: 'asc' | 'desc'
): SlimKeysetPayload | null {
    try {
        const parsed = JSON.parse(fromBase64Url(raw)) as unknown;
        if (!parsed || typeof parsed !== 'object') return null;
        const o = parsed as Partial<SlimKeysetPayload>;
        if (o.v !== CURSOR_VERSION || o.t !== 'slim') return null;
        if (o.sort !== expectedSort || o.dir !== expectedDir) return null;
        if (typeof o.id !== 'string' || !o.id.trim()) return null;
        if (o.p === undefined || o.p === null) return null;
        if (typeof o.p !== 'string' && typeof o.p !== 'number') return null;
        return o as SlimKeysetPayload;
    } catch {
        return null;
    }
}

/** Build cursor payload from last row of a slim-pages response (DB source). */
export function slimRowToKeysetPayload(page: {
    domainPageId?: string;
    url: string;
    score?: number;
    ux?: { score?: number };
    stats?: { errors?: number; warnings?: number; notices?: number };
}, sort: SlimSortKey, dir: 'asc' | 'desc'): SlimKeysetPayload | null {
    const id = page.domainPageId?.trim();
    if (!id) return null;
    let p: string | number;
    switch (sort) {
        case 'url':
            p = page.url ?? '';
            break;
        case 'score':
            p = page.score ?? 0;
            break;
        case 'uxScore':
            p = page.ux?.score ?? -1;
            break;
        case 'issues': {
            const e = page.stats?.errors ?? 0;
            const w = page.stats?.warnings ?? 0;
            const n = page.stats?.notices ?? 0;
            p = e + w + n;
            break;
        }
        default:
            p = page.url ?? '';
    }
    return { v: CURSOR_VERSION, t: 'slim', sort, dir, id, p };
}

export function seoRowToKeysetPayload(
    row: { domainPageId?: string; url: string; wordCount: number },
    sort: SeoPagesSortKey,
    dir: 'asc' | 'desc'
): SeoKeysetPayload | null {
    const id = row.domainPageId?.trim();
    if (!id) return null;
    return {
        v: CURSOR_VERSION,
        t: 'seo',
        sort,
        dir,
        id,
        wordCount: row.wordCount,
        url: row.url,
    };
}

export function decodeSeoKeysetCursor(
    raw: string,
    expectedSort: SeoPagesSortKey,
    expectedDir: 'asc' | 'desc'
): SeoKeysetPayload | null {
    try {
        const parsed = JSON.parse(fromBase64Url(raw)) as unknown;
        if (!parsed || typeof parsed !== 'object') return null;
        const o = parsed as Partial<SeoKeysetPayload>;
        if (o.v !== CURSOR_VERSION || o.t !== 'seo') return null;
        if (o.sort !== expectedSort || o.dir !== expectedDir) return null;
        if (typeof o.id !== 'string' || !o.id.trim()) return null;
        if (typeof o.url !== 'string') return null;
        if (typeof o.wordCount !== 'number' || !Number.isFinite(o.wordCount)) return null;
        return o as SeoKeysetPayload;
    } catch {
        return null;
    }
}
