/* ------------------------------------------------------------------ */
/*  CHECKION – Scan persistence (DB)                                   */
/* ------------------------------------------------------------------ */

import { eq, and, desc, isNull, count, sql } from 'drizzle-orm';
import { getDb } from './index';
import { scans, domainScans } from './schema';
import type { ScanResult, DomainScanResult } from '@/lib/types';
import { normalizeScanUrl } from '@/lib/url-normalize';

export type DomainScanSummaryRow = { id: string; domain: string; timestamp: string; status: string; score: number; totalPages: number };

/** Summary row + flag whether payload has `aggregated` (avoids loading full JSONB for search). */
export type DomainScanSearchRow = DomainScanSummaryRow & {
    hasStoredAggregated: boolean;
};
import type { UxCxSummary } from '@/lib/llm-summary-types';
import type { UxCheckV2Summary } from '@/lib/ux-check-types';

export async function addScan(userId: string, result: ScanResult, options?: { projectId?: string | null }): Promise<void> {
    const db = getDb();
    await db.insert(scans).values({
        id: result.id,
        userId,
        projectId: options?.projectId ?? null,
        url: result.url,
        device: result.device,
        groupId: result.groupId ?? null,
        timestamp: result.timestamp,
        result: result as unknown as Record<string, unknown>,
    });
}

export async function getScan(id: string, userId: string): Promise<ScanResult | null> {
    const db = getDb();
    const rows = await db.select().from(scans).where(and(eq(scans.id, id), eq(scans.userId, userId))).limit(1);
    if (rows.length === 0) return null;
    return rows[0].result as unknown as ScanResult;
}

/** Returns scan result plus llm_summary and projectId for API response. */
export async function getScanWithSummary(id: string, userId: string): Promise<{ result: ScanResult; llmSummary: UxCxSummary | null; projectId: string | null } | null> {
    const db = getDb();
    const rows = await db.select({
        result: scans.result,
        llmSummary: scans.llmSummary,
        projectId: scans.projectId,
    }).from(scans).where(and(eq(scans.id, id), eq(scans.userId, userId))).limit(1);
    if (rows.length === 0) return null;
    return {
        result: rows[0].result as unknown as ScanResult,
        llmSummary: (rows[0].llmSummary as UxCxSummary | null) ?? null,
        projectId: rows[0].projectId ?? null,
    };
}

export async function updateScanSummary(id: string, userId: string, summary: UxCxSummary | UxCheckV2Summary): Promise<boolean> {
    const db = getDb();
    const updated = await db.update(scans)
        .set({ llmSummary: summary as unknown as Record<string, unknown> })
        .where(and(eq(scans.id, id), eq(scans.userId, userId)));
    return (updated.rowCount ?? 0) > 0;
}

/** Merge a patch into the existing scan result (e.g. saliencyHeatmap). */
export async function updateScanResult(id: string, userId: string, patch: Partial<ScanResult>): Promise<boolean> {
    const db = getDb();
    const rows = await db.select({ result: scans.result }).from(scans).where(and(eq(scans.id, id), eq(scans.userId, userId))).limit(1);
    if (rows.length === 0) return false;
    const current = rows[0].result as unknown as ScanResult;
    const merged = { ...current, ...patch };
    const updated = await db.update(scans)
        .set({ result: merged as unknown as Record<string, unknown> })
        .where(and(eq(scans.id, id), eq(scans.userId, userId)));
    return (updated.rowCount ?? 0) > 0;
}

export async function listScans(userId: string): Promise<ScanResult[]> {
    const db = getDb();
    const rows = await db.select({ result: scans.result }).from(scans).where(eq(scans.userId, userId)).orderBy(desc(scans.timestamp));
    return rows.map(r => r.result as unknown as ScanResult);
}

/** Only scans that are not part of a domain scan (standalone single-URL scans). Optional projectId filter. */
export async function listStandaloneScans(userId: string, options?: { limit?: number; offset?: number; projectId?: string | null }): Promise<ScanResult[]> {
    const db = getDb();
    const whereCond = options?.projectId === undefined
        ? and(eq(scans.userId, userId), isNull(scans.groupId))
        : options.projectId === null
            ? and(eq(scans.userId, userId), isNull(scans.groupId), isNull(scans.projectId))
            : and(eq(scans.userId, userId), isNull(scans.groupId), eq(scans.projectId, options.projectId));
    const base = db.select({ result: scans.result }).from(scans).where(whereCond).orderBy(desc(scans.timestamp));
    const rows = options?.limit != null || options?.offset != null
        ? await base.limit(options.limit ?? 10000).offset(options.offset ?? 0)
        : await base;
    return rows.map(r => r.result as unknown as ScanResult);
}

/** All single-scan results belonging to a domain (deep) scan; for journey/buildPageContexts. */
export async function listScansByGroupId(userId: string, groupId: string): Promise<ScanResult[]> {
    const db = getDb();
    const rows = await db.select({ result: scans.result })
        .from(scans)
        .where(and(eq(scans.userId, userId), eq(scans.groupId, groupId)));
    return rows.map(r => r.result as unknown as ScanResult);
}

export async function getStandaloneScansCount(userId: string, projectId?: string | null): Promise<number> {
    const db = getDb();
    const whereCond = projectId === undefined
        ? and(eq(scans.userId, userId), isNull(scans.groupId))
        : projectId === null
            ? and(eq(scans.userId, userId), isNull(scans.groupId), isNull(scans.projectId))
            : and(eq(scans.userId, userId), isNull(scans.groupId), eq(scans.projectId, projectId));
    const rows = await db.select({ count: count() }).from(scans).where(whereCond);
    return Number(rows[0]?.count ?? 0);
}

export async function updateScanProject(scanId: string, userId: string, projectId: string | null): Promise<boolean> {
    const db = getDb();
    const updated = await db.update(scans).set({ projectId }).where(and(eq(scans.id, scanId), eq(scans.userId, userId)));
    return (updated.rowCount ?? 0) > 0;
}

export async function deleteScan(id: string, userId: string): Promise<boolean> {
    const db = getDb();
    const deleted = await db.delete(scans).where(and(eq(scans.id, id), eq(scans.userId, userId)));
    return (deleted.rowCount ?? 0) > 0;
}

export async function createDomainScan(userId: string, scan: DomainScanResult, options?: { projectId?: string | null }): Promise<void> {
    const db = getDb();
    await db.insert(domainScans).values({
        id: scan.id,
        userId,
        projectId: options?.projectId ?? null,
        domain: scan.domain,
        status: scan.status,
        timestamp: scan.timestamp,
        payload: scan as unknown as Record<string, unknown>,
    });
}

export async function updateDomainScan(id: string, userId: string, update: Partial<DomainScanResult>): Promise<boolean> {
    const db = getDb();
    const existing = await db.select().from(domainScans).where(and(eq(domainScans.id, id), eq(domainScans.userId, userId))).limit(1);
    if (existing.length === 0) return false;
    const merged = { ...(existing[0].payload as DomainScanResult), ...update };
    await db.update(domainScans).set({ payload: merged as unknown as Record<string, unknown>, status: merged.status, timestamp: merged.timestamp }).where(and(eq(domainScans.id, id), eq(domainScans.userId, userId)));
    return true;
}

export async function getDomainScan(id: string, userId: string): Promise<DomainScanResult | null> {
    const db = getDb();
    const rows = await db.select().from(domainScans).where(and(eq(domainScans.id, id), eq(domainScans.userId, userId))).limit(1);
    if (rows.length === 0) return null;
    return rows[0].payload as unknown as DomainScanResult;
}

/** Returns domain scan payload and projectId for API response. */
export async function getDomainScanWithProjectId(id: string, userId: string): Promise<{ result: DomainScanResult; projectId: string | null } | null> {
    const db = getDb();
    const rows = await db.select({ payload: domainScans.payload, projectId: domainScans.projectId })
        .from(domainScans).where(and(eq(domainScans.id, id), eq(domainScans.userId, userId))).limit(1);
    if (rows.length === 0) return null;
    return {
        result: rows[0].payload as unknown as DomainScanResult,
        projectId: rows[0].projectId ?? null,
    };
}

export async function updateDomainScanProject(id: string, userId: string, projectId: string | null): Promise<boolean> {
    const db = getDb();
    const updated = await db.update(domainScans).set({ projectId }).where(and(eq(domainScans.id, id), eq(domainScans.userId, userId)));
    return (updated.rowCount ?? 0) > 0;
}

/** List only summary fields (no payload) to keep response small for list/cache. Optional projectId filter. */
export async function listDomainScanSummaries(userId: string, options?: { limit?: number; offset?: number; projectId?: string | null }): Promise<DomainScanSummaryRow[]> {
    const db = getDb();
    const whereCond = options?.projectId === undefined
        ? eq(domainScans.userId, userId)
        : options.projectId === null
            ? and(eq(domainScans.userId, userId), isNull(domainScans.projectId))
            : and(eq(domainScans.userId, userId), eq(domainScans.projectId, options.projectId));
    const base = db
        .select({
            id: domainScans.id,
            domain: domainScans.domain,
            timestamp: domainScans.timestamp,
            status: domainScans.status,
            score: sql<number>`(${domainScans.payload}->>'score')::int`,
            totalPages: sql<number>`(${domainScans.payload}->>'totalPages')::int`,
        })
        .from(domainScans)
        .where(whereCond)
        .orderBy(desc(domainScans.timestamp));
    const rows = options?.limit != null || options?.offset != null
        ? await base.limit(options.limit ?? 10000).offset(options.offset ?? 0)
        : await base;
    return rows.map(r => ({
        id: r.id,
        domain: r.domain,
        timestamp: r.timestamp,
        status: r.status,
        score: r.score ?? 0,
        totalPages: r.totalPages ?? 0,
    }));
}

/**
 * Same as listDomainScanSummaries plus `hasStoredAggregated` from JSONB (no full payload read).
 * Use for dashboard search over domain scans instead of listDomainScans.
 */
export async function listDomainScanSummariesForSearch(
    userId: string,
    options?: { limit?: number; offset?: number; projectId?: string | null }
): Promise<DomainScanSearchRow[]> {
    const db = getDb();
    const whereCond = options?.projectId === undefined
        ? eq(domainScans.userId, userId)
        : options.projectId === null
            ? and(eq(domainScans.userId, userId), isNull(domainScans.projectId))
            : and(eq(domainScans.userId, userId), eq(domainScans.projectId, options.projectId));
    const base = db
        .select({
            id: domainScans.id,
            domain: domainScans.domain,
            timestamp: domainScans.timestamp,
            status: domainScans.status,
            score: sql<number>`(${domainScans.payload}->>'score')::int`,
            totalPages: sql<number>`(${domainScans.payload}->>'totalPages')::int`,
            hasStoredAggregated: sql<boolean>`(${domainScans.payload}->'aggregated') IS NOT NULL`,
        })
        .from(domainScans)
        .where(whereCond)
        .orderBy(desc(domainScans.timestamp));
    const rows = options?.limit != null || options?.offset != null
        ? await base.limit(options.limit ?? 10000).offset(options.offset ?? 0)
        : await base;
    return rows.map(r => ({
        id: r.id,
        domain: r.domain,
        timestamp: r.timestamp,
        status: r.status,
        score: r.score ?? 0,
        totalPages: r.totalPages ?? 0,
        hasStoredAggregated: Boolean(r.hasStoredAggregated),
    }));
}

export async function listDomainScans(userId: string, options?: { limit?: number; offset?: number; projectId?: string | null }): Promise<DomainScanResult[]> {
    const db = getDb();
    const whereCond = options?.projectId === undefined
        ? eq(domainScans.userId, userId)
        : options.projectId === null
            ? and(eq(domainScans.userId, userId), isNull(domainScans.projectId))
            : and(eq(domainScans.userId, userId), eq(domainScans.projectId, options.projectId));
    const base = db.select({ payload: domainScans.payload }).from(domainScans).where(whereCond).orderBy(desc(domainScans.timestamp));
    const rows = options?.limit != null || options?.offset != null
        ? await base.limit(options.limit ?? 10000).offset(options.offset ?? 0)
        : await base;
    return rows.map(r => r.payload as unknown as DomainScanResult);
}

export async function getDomainScansCount(userId: string, projectId?: string | null): Promise<number> {
    const db = getDb();
    const whereCond = projectId === undefined
        ? eq(domainScans.userId, userId)
        : projectId === null
            ? and(eq(domainScans.userId, userId), isNull(domainScans.projectId))
            : and(eq(domainScans.userId, userId), eq(domainScans.projectId, projectId));
    const rows = await db.select({ count: count() }).from(domainScans).where(whereCond);
    return Number(rows[0]?.count ?? 0);
}

export async function deleteDomainScan(id: string, userId: string): Promise<boolean> {
    const db = getDb();
    const deleted = await db.delete(domainScans).where(and(eq(domainScans.id, id), eq(domainScans.userId, userId)));
    return (deleted.rowCount ?? 0) > 0;
}

const FINGERPRINT_SCAN_LOOKBACK = 200;

/**
 * Latest scan row for user/device whose normalized URL matches and optional project filter,
 * with non-empty document cache hints (for deep-scan HEAD reuse).
 */
export async function getLatestScanForUrlFingerprint(
    userId: string,
    normalizedUrl: string,
    device: string,
    projectId?: string | null,
): Promise<{ documentCacheHints: NonNullable<ScanResult['documentCacheHints']>; scanResult: ScanResult } | null> {
    const db = getDb();
    const rows = await db
        .select({ result: scans.result, projectId: scans.projectId })
        .from(scans)
        .where(and(eq(scans.userId, userId), eq(scans.device, device)))
        .orderBy(desc(scans.timestamp))
        .limit(FINGERPRINT_SCAN_LOOKBACK);

    for (const row of rows) {
        const scanResult = row.result as unknown as ScanResult;
        if (normalizeScanUrl(scanResult.url) !== normalizedUrl) continue;

        if (projectId === undefined) {
            // any project
        } else if (projectId === null) {
            if (row.projectId != null) continue;
        } else if (row.projectId !== projectId) {
            continue;
        }

        const hints = scanResult.documentCacheHints;
        const etag = hints?.etag?.trim();
        const lastModified = hints?.lastModified?.trim();
        if (!etag && !lastModified) continue;

        return {
            documentCacheHints: {
                ...(etag ? { etag } : {}),
                ...(lastModified ? { lastModified } : {}),
            },
            scanResult,
        };
    }
    return null;
}
