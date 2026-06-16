/**
 * Lightweight per-page inputs for domain scan diffs (no full scan payload).
 */

import { and, asc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { domainPages, scans } from '@/lib/db/schema';
import type { DomainPageDiffInput } from '@/lib/domain-scan-diff';
import { normalizeDiffUrl } from '@/lib/domain-scan-diff';
import type { PageClassification, ScanResult } from '@/lib/types';

function parsePageClassification(raw: unknown): DomainPageDiffInput['pageClassification'] | undefined {
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const pc = raw as PageClassification;
    const primaryTag = pc.tagTiers?.[0]?.tag;
    const tier = pc.tagTiers?.[0]?.tier;
    if (!primaryTag && tier == null) return undefined;
    return {
        ...(primaryTag ? { primaryTag } : {}),
        ...(tier != null ? { tier } : {}),
    };
}

function parseDocumentCacheHints(raw: unknown): ScanResult['documentCacheHints'] | undefined {
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const h = raw as ScanResult['documentCacheHints'];
    if (!h?.etag && !h?.lastModified) return undefined;
    return h;
}

function parseContentFingerprint(raw: unknown): string | undefined {
    if (typeof raw !== 'string') return undefined;
    const t = raw.trim();
    return t.length > 0 ? t : undefined;
}

function parseReusedUnchanged(raw: unknown): boolean | undefined {
    if (raw === true || raw === 'true') return true;
    if (raw === false || raw === 'false') return false;
    return undefined;
}

function parseContentFreshnessAgeDays(raw: unknown): number | null {
    if (raw == null || raw === '') return null;
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) ? n : null;
}

/**
 * Load all pages for a domain scan with diff-relevant JSONB slices from linked scan rows.
 */
export async function listDomainScanDiffPageInputs(
    domainScanId: string,
    userId: string,
): Promise<DomainPageDiffInput[]> {
    const db = getDb();
    const rows = await db
        .select({
            url: domainPages.url,
            hintsJson: sql<unknown>`(${scans.result})::jsonb->'documentCacheHints'`,
            contentFingerprint: sql<unknown>`(${scans.result})::jsonb->>'contentFingerprint'`,
            reusedUnchanged: sql<unknown>`(${scans.result})::jsonb->'reusedUnchanged'`,
            contentFreshnessAge: sql<unknown>`(${scans.result})::jsonb->'contentFreshness'->'ageDays'`,
            pageClassificationRaw: sql<unknown>`(${scans.result})::jsonb->'pageClassification'`,
        })
        .from(domainPages)
        .leftJoin(scans, eq(scans.id, domainPages.pageScanId))
        .where(and(eq(domainPages.domainScanId, domainScanId), eq(domainPages.userId, userId)))
        .orderBy(asc(domainPages.url));

    return rows.map((r) => {
        const url = normalizeDiffUrl(r.url);
        const reusedUnchanged = parseReusedUnchanged(r.reusedUnchanged);
        const contentFingerprint = parseContentFingerprint(r.contentFingerprint);
        const contentFreshnessAgeDays = parseContentFreshnessAgeDays(r.contentFreshnessAge);

        return {
            url,
            documentCacheHints: parseDocumentCacheHints(r.hintsJson),
            ...(reusedUnchanged !== undefined ? { reusedUnchanged } : {}),
            ...(contentFingerprint ? { contentFingerprint } : {}),
            contentFreshnessAgeDays,
            pageClassification: parsePageClassification(r.pageClassificationRaw),
        };
    });
}
