/* ------------------------------------------------------------------ */
/*  Paged SlimPage[] for domain UI — DB-first, payload slice fallback   */
/* ------------------------------------------------------------------ */

import { and, asc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { domainPages, scans } from '@/lib/db/schema';
import type { DomainScanResult, SlimPage } from '@/lib/types';
import { domainPageRowId } from '@/lib/db/domain-issues';

export async function countDomainPagesInDb(domainScanId: string, userId: string): Promise<number> {
    const db = getDb();
    const rows = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(domainPages)
        .where(and(eq(domainPages.domainScanId, domainScanId), eq(domainPages.userId, userId)));
    return Number(rows[0]?.c ?? 0);
}

/**
 * One page of SlimPage rows from `domain_pages` + scan stats (no full payload load).
 */
export async function listSlimPagesFromDomainPagesTable(params: {
    domainScanId: string;
    userId: string;
    offset: number;
    limit: number;
}): Promise<SlimPage[]> {
    const db = getDb();
    const rows = await db
        .select({
            domainPageId: domainPages.id,
            url: domainPages.url,
            pageScanId: domainPages.pageScanId,
            score: domainPages.score,
            uxScore: domainPages.uxScore,
            statsErrors: sql<number>`COALESCE((${scans.result}->'stats'->>'errors')::int, 0)`,
            statsWarnings: sql<number>`COALESCE((${scans.result}->'stats'->>'warnings')::int, 0)`,
            statsNotices: sql<number>`COALESCE((${scans.result}->'stats'->>'notices')::int, 0)`,
        })
        .from(domainPages)
        .leftJoin(scans, eq(scans.id, domainPages.pageScanId))
        .where(and(eq(domainPages.domainScanId, params.domainScanId), eq(domainPages.userId, params.userId)))
        .orderBy(asc(domainPages.url))
        .limit(params.limit)
        .offset(params.offset);

    return rows.map((r) => {
        const scanId = r.pageScanId ?? r.domainPageId;
        return {
            id: scanId,
            domainPageId: r.domainPageId,
            url: r.url,
            score: r.score ?? 0,
            stats: {
                errors: Number(r.statsErrors ?? 0),
                warnings: Number(r.statsWarnings ?? 0),
                notices: Number(r.statsNotices ?? 0),
            },
            ux: r.uxScore != null ? { score: r.uxScore } : undefined,
        };
    });
}

/** Slice stored payload pages (legacy / no domain_pages rows). */
export function sliceSlimPagesFromPayload(scan: DomainScanResult, offset: number, limit: number, domainScanId: string): SlimPage[] {
    const raw = scan.pages;
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const slice = raw.slice(offset, offset + limit) as SlimPage[];
    return slice.map((p) => ({
        ...p,
        domainPageId: p.domainPageId ?? domainPageRowId(domainScanId, p.url),
    }));
}

export function countPayloadPages(scan: DomainScanResult): number {
    const raw = scan.pages;
    return Array.isArray(raw) ? raw.length : 0;
}
