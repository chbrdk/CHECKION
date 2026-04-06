/* ------------------------------------------------------------------ */
/*  Paged SlimPage[] for domain UI — DB-first, payload slice fallback   */
/* ------------------------------------------------------------------ */

import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { domainPages, scans } from '@/lib/db/schema';
import type { DomainScanResult, SlimPage } from '@/lib/types';
import { domainPageRowId } from '@/lib/db/domain-issues';

export type SlimSortKey = 'url' | 'score' | 'uxScore' | 'issues';

/**
 * Sort SlimPage[] in memory (payload fallback) before offset/limit slice.
 */
export function sortSlimPagesInMemory(pages: SlimPage[], sort: SlimSortKey, dir: 'asc' | 'desc'): SlimPage[] {
    const arr = [...pages];
    arr.sort((a, b) => {
        let cmp = 0;
        switch (sort) {
            case 'url':
                cmp = (a.url ?? '').localeCompare(b.url ?? '');
                break;
            case 'score':
                cmp = (a.score ?? 0) - (b.score ?? 0);
                break;
            case 'uxScore':
                cmp = (a.ux?.score ?? 0) - (b.ux?.score ?? 0);
                break;
            case 'issues': {
                const ia = (a.stats?.errors ?? 0) + (a.stats?.warnings ?? 0) + (a.stats?.notices ?? 0);
                const ib = (b.stats?.errors ?? 0) + (b.stats?.warnings ?? 0) + (b.stats?.notices ?? 0);
                cmp = ia - ib;
                break;
            }
            default:
                break;
        }
        return dir === 'asc' ? cmp : -cmp;
    });
    return arr;
}

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
    sort?: SlimSortKey;
    sortDir?: 'asc' | 'desc';
}): Promise<SlimPage[]> {
    const db = getDb();
    const sort = params.sort ?? 'url';
    const sortDir = params.sortDir ?? 'asc';
    const issuesSum = sql<number>`COALESCE((${scans.result}->'stats'->>'errors')::int, 0) + COALESCE((${scans.result}->'stats'->>'warnings')::int, 0) + COALESCE((${scans.result}->'stats'->>'notices')::int, 0)`;
    const scoreCoalesced = sql<number>`COALESCE(${domainPages.score}, 0)`;
    const uxCoalesced = sql<number>`COALESCE(${domainPages.uxScore}, -1)`;

    const orderBy =
        sort === 'url'
            ? sortDir === 'asc'
                ? asc(domainPages.url)
                : desc(domainPages.url)
            : sort === 'score'
              ? sortDir === 'asc'
                  ? asc(scoreCoalesced)
                  : desc(scoreCoalesced)
              : sort === 'uxScore'
                ? sortDir === 'asc'
                    ? asc(uxCoalesced)
                    : desc(uxCoalesced)
                : sortDir === 'asc'
                  ? asc(issuesSum)
                  : desc(issuesSum);

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
        .orderBy(orderBy)
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
export function sliceSlimPagesFromPayload(
    scan: DomainScanResult,
    offset: number,
    limit: number,
    domainScanId: string,
    sort: SlimSortKey = 'url',
    sortDir: 'asc' | 'desc' = 'asc'
): SlimPage[] {
    const raw = scan.pages;
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const asSlim = raw as SlimPage[];
    const sorted = sortSlimPagesInMemory(asSlim, sort, sortDir);
    const slice = sorted.slice(offset, offset + limit);
    return slice.map((p) => ({
        ...p,
        domainPageId: p.domainPageId ?? domainPageRowId(domainScanId, p.url),
    }));
}

export function countPayloadPages(scan: DomainScanResult): number {
    const raw = scan.pages;
    return Array.isArray(raw) ? raw.length : 0;
}

/** Resolve single-page scan id for a URL in a domain scan (exact URL match as stored). */
export async function findScanIdForDomainPageUrl(params: {
    domainScanId: string;
    userId: string;
    url: string;
}): Promise<{ scanId: string } | null> {
    const db = getDb();
    const rows = await db
        .select({ pageScanId: domainPages.pageScanId, id: domainPages.id })
        .from(domainPages)
        .where(
            and(
                eq(domainPages.domainScanId, params.domainScanId),
                eq(domainPages.userId, params.userId),
                eq(domainPages.url, params.url)
            )
        )
        .limit(1);
    if (rows.length === 0) return null;
    const scanId = rows[0].pageScanId ?? rows[0].id;
    return { scanId };
}

/** Payload fallback: find SlimPage id for URL in stored `domain_scans.payload.pages`. */
export function findScanIdForUrlInPayload(scan: DomainScanResult, url: string): { scanId: string } | null {
    const raw = scan.pages;
    if (!Array.isArray(raw) || raw.length === 0) return null;
    for (const p of raw as SlimPage[]) {
        if (p.url === url && p.id) return { scanId: p.id };
    }
    return null;
}
