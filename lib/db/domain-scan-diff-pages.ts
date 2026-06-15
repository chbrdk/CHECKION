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
            reusedUnchanged: sql<boolean | null>`(${scans.result})::jsonb->>'reusedUnchanged'`,
            contentFreshnessAge: sql<number | null>`(${scans.result})::jsonb->'contentFreshness'->>'ageDays'`,
            pageClassificationRaw: sql<unknown>`(${scans.result})::jsonb->'pageClassification'`,
        })
        .from(domainPages)
        .leftJoin(scans, eq(scans.id, domainPages.pageScanId))
        .where(and(eq(domainPages.domainScanId, domainScanId), eq(domainPages.userId, userId)))
        .orderBy(asc(domainPages.url));

    return rows.map((r) => {
        const url = normalizeDiffUrl(r.url);
        const reusedRaw = r.reusedUnchanged;
        const reusedUnchanged =
            reusedRaw === true || reusedRaw === 'true' ? true : reusedRaw === false ? false : undefined;
        const ageRaw = r.contentFreshnessAge;
        const contentFreshnessAgeDays =
            ageRaw != null && ageRaw !== '' ? Number(ageRaw) : null;

        return {
            url,
            documentCacheHints: parseDocumentCacheHints(r.hintsJson),
            ...(reusedUnchanged !== undefined ? { reusedUnchanged } : {}),
            contentFreshnessAgeDays: Number.isFinite(contentFreshnessAgeDays) ? contentFreshnessAgeDays : null,
            pageClassification: parsePageClassification(r.pageClassificationRaw),
        };
    });
}
