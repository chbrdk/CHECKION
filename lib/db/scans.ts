/* ------------------------------------------------------------------ */
/*  CHECKION – Scan persistence (DB)                                   */
/* ------------------------------------------------------------------ */

import { eq, and, desc, isNull, count, sql, inArray, ilike } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { getDb } from './index';
import { scans, domainScans, projects } from './schema';
import { coerceJsonStringArray, normalizeIndustry, normalizeTagFilter, normalizeTagList } from '@/lib/tag-utils';
import { getProjectDomainScanReferences } from './project-domain-references';
import type { ScanResult, DomainScanResult, DomainScanStatus } from '@/lib/types';
import type { UxCxSummary } from '@/lib/llm-summary-types';
import type { UxCheckV2Summary } from '@/lib/ux-check-types';
import { normalizeScanUrl } from '@/lib/url-normalize';
import { buildDomainScanLineageKey } from '@/lib/domain-scan-lineage';

export type DomainScanSummaryRow = {
    id: string;
    domain: string;
    timestamp: string;
    status: string;
    score: number;
    totalPages: number;
    lineageVersion: number;
    /** Null when the deep scan was started outside a project. */
    projectId: string | null;
    /** Owner (`domain_scans.user_id`). */
    userId: string;
    /** From linked project when `project_id` is set. */
    industry: string | null;
    projectTags: string[];
    /** Scan-level tags (union with project tags for filters). */
    tags: string[];
};

/** Summary row + flag whether payload has `aggregated` (avoids loading full JSONB for search). */
export type DomainScanSearchRow = DomainScanSummaryRow & {
    hasStoredAggregated: boolean;
};

/** Max length for `q` domain substring filter (`listDomainScanSummaries` / count). */
export const DOMAIN_SCAN_LIST_QUERY_MAX_LEN = 200;

export type DomainScanListQueryOptions = {
    limit?: number;
    offset?: number;
    projectId?: string | null;
    /** Case-insensitive substring match on `domain_scans.domain`; `%` `_` `\` stripped from input. */
    q?: string;
    status?: DomainScanStatus;
    /** Exact match on `projects.industry` when the scan has a project. */
    industry?: string;
    /** Normalized tag: scan or project tags must contain this tag. */
    tag?: string;
};

function buildDomainScanListWhere(
    userId: string | undefined,
    options?: Pick<DomainScanListQueryOptions, 'projectId' | 'q' | 'status'>
) {
    const conditions = [];
    if (userId !== undefined) {
        conditions.push(eq(domainScans.userId, userId));
    }
    if (options?.projectId !== undefined) {
        if (options.projectId === null) {
            conditions.push(isNull(domainScans.projectId));
        } else {
            conditions.push(eq(domainScans.projectId, options.projectId));
        }
    }
    const rawQ = options?.q?.trim();
    if (rawQ) {
        const safe = rawQ.slice(0, DOMAIN_SCAN_LIST_QUERY_MAX_LEN).replace(/[%_\\]/g, '');
        if (safe.length > 0) {
            conditions.push(ilike(domainScans.domain, `%${safe}%`));
        }
    }
    if (options?.status) {
        conditions.push(eq(domainScans.status, options.status));
    }
    if (conditions.length === 0) {
        return sql`true`;
    }
    if (conditions.length === 1) {
        return conditions[0];
    }
    return and(...conditions)!;
}

/** Lineage head subquery / list filters; uses `LEFT JOIN projects` for industry + tag conditions. */
function buildDomainScanLineageWhere(
    filterUserId: string | undefined,
    options?: DomainScanListQueryOptions
): SQL {
    const base = buildDomainScanListWhere(filterUserId, options);
    const ind = normalizeIndustry(options?.industry ?? undefined);
    const tag = normalizeTagFilter(options?.tag);
    if (!ind && !tag) return base;
    const parts: SQL[] = [base];
    if (ind) {
        parts.push(eq(projects.industry, ind));
    }
    if (tag) {
        const jsonbLiteral = `'${JSON.stringify([tag]).replace(/'/g, "''")}'::jsonb`;
        parts.push(sql`(coalesce(${domainScans.tags}, '[]'::jsonb) @> ${sql.raw(jsonbLiteral)} OR coalesce(${projects.tags}, '[]'::jsonb) @> ${sql.raw(jsonbLiteral)})`);
    }
    return and(...parts)!;
}

function isPgUniqueViolation(err: unknown): boolean {
    return (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: string }).code === '23505'
    );
}

/** `coalesce(lineage_key, id)` — legacy rows without lineage_key stay one row per id. */
function domainScanLineageGroupSql() {
    return sql<string>`coalesce(${domainScans.lineageKey}, ${domainScans.id})`;
}

function buildLatestDomainScanHeadSubquery(db: ReturnType<typeof getDb>, lineageScopeWhere: SQL) {
    const grp = domainScanLineageGroupSql();
    return db
        .select({
            groupKey: grp.as('group_key'),
            maxVersion: sql<number>`max(${domainScans.lineageVersion})`.as('max_version'),
        })
        .from(domainScans)
        .leftJoin(projects, eq(domainScans.projectId, projects.id))
        .where(lineageScopeWhere)
        .groupBy(grp)
        .as('domain_lineage_head');
}

/** Domain scan rows still in progress (UI polling / resume). */
const ACTIVE_DOMAIN_SCAN_STATUSES = ['queued', 'scanning', 'paused', 'cancelling'] as const;

/**
 * Active deep scans for a project: rows with `project_id = projectId` plus competitor scans
 * linked via `project_domain_scan_references` (non-terminal status only).
 */
export async function listActiveDomainScansForProject(
    userId: string,
    projectId: string
): Promise<Array<{ scanId: string; label: string; status: string }>> {
    const db = getDb();
    const statusList = [...ACTIVE_DOMAIN_SCAN_STATUSES];

    const byId = new Map<string, { scanId: string; label: string; status: string }>();

    const lineageScope = buildDomainScanLineageWhere(userId, { projectId });
    const latestSq = buildLatestDomainScanHeadSubquery(db, lineageScope);
    const joinLatest = sql`coalesce(${domainScans.lineageKey}, ${domainScans.id}) = ${latestSq.groupKey} AND ${domainScans.lineageVersion} = ${latestSq.maxVersion}`;

    const ownRows = await db
        .select({
            id: domainScans.id,
            domain: domainScans.domain,
            status: domainScans.status,
        })
        .from(domainScans)
        .innerJoin(latestSq, joinLatest)
        .where(
            and(
                eq(domainScans.userId, userId),
                eq(domainScans.projectId, projectId),
                inArray(domainScans.status, statusList)
            )
        );

    for (const row of ownRows) {
        byId.set(row.id, { scanId: row.id, label: row.domain, status: row.status });
    }

    const refs = await getProjectDomainScanReferences(projectId);
    for (const ref of refs) {
        const rows = await db
            .select({
                id: domainScans.id,
                status: domainScans.status,
            })
            .from(domainScans)
            .where(
                and(
                    eq(domainScans.userId, userId),
                    eq(domainScans.id, ref.domainScanId),
                    inArray(domainScans.status, statusList)
                )
            )
            .limit(1);
        const hit = rows[0];
        if (hit) {
            byId.set(hit.id, { scanId: hit.id, label: ref.domain, status: hit.status });
        }
    }

    return Array.from(byId.values());
}

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
    const lineageKey = buildDomainScanLineageKey(userId, options?.projectId ?? null, scan.domain);
    for (let attempt = 0; attempt < 6; attempt++) {
        const maxRows = await db
            .select({ m: sql<number>`coalesce(max(${domainScans.lineageVersion}), 0)` })
            .from(domainScans)
            .where(eq(domainScans.lineageKey, lineageKey));
        const nextVersion = Number(maxRows[0]?.m ?? 0) + 1;
        try {
            await db.insert(domainScans).values({
                id: scan.id,
                userId,
                projectId: options?.projectId ?? null,
                domain: scan.domain,
                status: scan.status,
                timestamp: scan.timestamp,
                payload: scan as unknown as Record<string, unknown>,
                lineageKey,
                lineageVersion: nextVersion,
                tags: [],
            });
            return;
        } catch (err) {
            if (!isPgUniqueViolation(err) || attempt === 5) throw err;
        }
    }
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

/** DB `project_id` for a domain scan (not stored inside JSON payload). */
export async function getDomainScanProjectId(id: string, userId: string): Promise<string | null> {
    const db = getDb();
    const rows = await db
        .select({ projectId: domainScans.projectId })
        .from(domainScans)
        .where(and(eq(domainScans.id, id), eq(domainScans.userId, userId)))
        .limit(1);
    const pid = rows[0]?.projectId;
    return pid != null && pid !== '' ? pid : null;
}

/** Returns domain scan payload, project link, and project classification fields (when joined). */
export async function getDomainScanWithProjectId(
    id: string,
    userId: string
): Promise<{
    result: DomainScanResult;
    projectId: string | null;
    industry: string | null;
    projectTags: string[];
    scanTags: string[];
} | null> {
    const db = getDb();
    const rows = await db
        .select({
            payload: domainScans.payload,
            projectId: domainScans.projectId,
            scanTagsCol: domainScans.tags,
            industry: projects.industry,
            projectTagsCol: projects.tags,
        })
        .from(domainScans)
        .leftJoin(projects, eq(domainScans.projectId, projects.id))
        .where(and(eq(domainScans.id, id), eq(domainScans.userId, userId)))
        .limit(1);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
        result: r.payload as unknown as DomainScanResult,
        projectId: r.projectId ?? null,
        industry: r.industry ?? null,
        projectTags: coerceJsonStringArray(r.projectTagsCol),
        scanTags: coerceJsonStringArray(r.scanTagsCol),
    };
}

export async function updateDomainScanProject(id: string, userId: string, projectId: string | null): Promise<boolean> {
    const db = getDb();
    const updated = await db.update(domainScans).set({ projectId }).where(and(eq(domainScans.id, id), eq(domainScans.userId, userId)));
    return (updated.rowCount ?? 0) > 0;
}

export async function updateDomainScanTags(id: string, userId: string, tags: string[]): Promise<boolean> {
    const db = getDb();
    const normalized = normalizeTagList(tags);
    const updated = await db
        .update(domainScans)
        .set({ tags: normalized })
        .where(and(eq(domainScans.id, id), eq(domainScans.userId, userId)));
    return (updated.rowCount ?? 0) > 0;
}

/** List only summary fields (no payload) to keep response small for list/cache. Optional projectId / q / status filter. */
async function queryDomainScanSummaries(
    filterUserId: string | undefined,
    options?: DomainScanListQueryOptions
): Promise<DomainScanSummaryRow[]> {
    const db = getDb();
    const lineageWhere = buildDomainScanLineageWhere(filterUserId, options);
    const latestSq = buildLatestDomainScanHeadSubquery(db, lineageWhere);
    const joinLatest = sql`coalesce(${domainScans.lineageKey}, ${domainScans.id}) = ${latestSq.groupKey} AND ${domainScans.lineageVersion} = ${latestSq.maxVersion}`;
    const base = db
        .select({
            id: domainScans.id,
            domain: domainScans.domain,
            timestamp: domainScans.timestamp,
            status: domainScans.status,
            score: sql<number>`(${domainScans.payload}->>'score')::int`,
            totalPages: sql<number>`(${domainScans.payload}->>'totalPages')::int`,
            lineageVersion: domainScans.lineageVersion,
            projectId: domainScans.projectId,
            userId: domainScans.userId,
            industry: projects.industry,
            projectTagsJson: projects.tags,
            scanTagsJson: domainScans.tags,
        })
        .from(domainScans)
        .innerJoin(latestSq, joinLatest)
        .leftJoin(projects, eq(domainScans.projectId, projects.id))
        .where(lineageWhere)
        .orderBy(desc(domainScans.timestamp));
    const rows = options?.limit != null || options?.offset != null
        ? await base.limit(options.limit ?? 10000).offset(options.offset ?? 0)
        : await base;
    return rows.map((r) => ({
        id: r.id,
        domain: r.domain,
        timestamp: r.timestamp,
        status: r.status,
        score: r.score ?? 0,
        totalPages: r.totalPages ?? 0,
        lineageVersion: r.lineageVersion ?? 1,
        projectId: r.projectId ?? null,
        userId: r.userId,
        industry: r.industry ?? null,
        projectTags: coerceJsonStringArray(r.projectTagsJson),
        tags: coerceJsonStringArray(r.scanTagsJson),
    }));
}

export async function listDomainScanSummaries(userId: string, options?: DomainScanListQueryOptions): Promise<DomainScanSummaryRow[]> {
    return queryDomainScanSummaries(userId, options);
}

/** All users’ deep scans (latest lineage head per key). For ops only — enforce auth in the API layer. */
export async function listDomainScanSummariesAllUsers(options?: DomainScanListQueryOptions): Promise<DomainScanSummaryRow[]> {
    return queryDomainScanSummaries(undefined, options);
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
    const lineageWhere = buildDomainScanLineageWhere(userId, { projectId: options?.projectId });
    const latestSq = buildLatestDomainScanHeadSubquery(db, lineageWhere);
    const joinLatest = sql`coalesce(${domainScans.lineageKey}, ${domainScans.id}) = ${latestSq.groupKey} AND ${domainScans.lineageVersion} = ${latestSq.maxVersion}`;
    const base = db
        .select({
            id: domainScans.id,
            domain: domainScans.domain,
            timestamp: domainScans.timestamp,
            status: domainScans.status,
            score: sql<number>`(${domainScans.payload}->>'score')::int`,
            totalPages: sql<number>`(${domainScans.payload}->>'totalPages')::int`,
            hasStoredAggregated: sql<boolean>`(${domainScans.payload}->'aggregated') IS NOT NULL`,
            lineageVersion: domainScans.lineageVersion,
            projectId: domainScans.projectId,
            userId: domainScans.userId,
            industry: projects.industry,
            projectTagsJson: projects.tags,
            scanTagsJson: domainScans.tags,
        })
        .from(domainScans)
        .innerJoin(latestSq, joinLatest)
        .leftJoin(projects, eq(domainScans.projectId, projects.id))
        .where(lineageWhere)
        .orderBy(desc(domainScans.timestamp));
    const rows = options?.limit != null || options?.offset != null
        ? await base.limit(options.limit ?? 10000).offset(options.offset ?? 0)
        : await base;
    return rows.map((r) => ({
        id: r.id,
        domain: r.domain,
        timestamp: r.timestamp,
        status: r.status,
        score: r.score ?? 0,
        totalPages: r.totalPages ?? 0,
        hasStoredAggregated: Boolean(r.hasStoredAggregated),
        lineageVersion: r.lineageVersion ?? 1,
        projectId: r.projectId ?? null,
        userId: r.userId,
        industry: r.industry ?? null,
        projectTags: coerceJsonStringArray(r.projectTagsJson),
        tags: coerceJsonStringArray(r.scanTagsJson),
    }));
}

export async function listDomainScans(userId: string, options?: { limit?: number; offset?: number; projectId?: string | null }): Promise<DomainScanResult[]> {
    const db = getDb();
    const lineageWhere = buildDomainScanLineageWhere(userId, { projectId: options?.projectId });
    const latestSq = buildLatestDomainScanHeadSubquery(db, lineageWhere);
    const joinLatest = sql`coalesce(${domainScans.lineageKey}, ${domainScans.id}) = ${latestSq.groupKey} AND ${domainScans.lineageVersion} = ${latestSq.maxVersion}`;
    const base = db
        .select({ payload: domainScans.payload })
        .from(domainScans)
        .innerJoin(latestSq, joinLatest)
        .leftJoin(projects, eq(domainScans.projectId, projects.id))
        .where(lineageWhere)
        .orderBy(desc(domainScans.timestamp));
    const rows = options?.limit != null || options?.offset != null
        ? await base.limit(options.limit ?? 10000).offset(options.offset ?? 0)
        : await base;
    return rows.map(r => r.payload as unknown as DomainScanResult);
}

async function queryDomainScansCount(
    filterUserId: string | undefined,
    options?: Pick<DomainScanListQueryOptions, 'projectId' | 'q' | 'status' | 'industry' | 'tag'>
): Promise<number> {
    const db = getDb();
    const lineageWhere = buildDomainScanLineageWhere(filterUserId, options);
    const latestSq = buildLatestDomainScanHeadSubquery(db, lineageWhere);
    const joinLatest = sql`coalesce(${domainScans.lineageKey}, ${domainScans.id}) = ${latestSq.groupKey} AND ${domainScans.lineageVersion} = ${latestSq.maxVersion}`;
    const rows = await db
        .select({ count: count() })
        .from(domainScans)
        .innerJoin(latestSq, joinLatest)
        .leftJoin(projects, eq(domainScans.projectId, projects.id))
        .where(lineageWhere);
    return Number(rows[0]?.count ?? 0);
}

export async function getDomainScansCount(
    userId: string,
    options?: Pick<DomainScanListQueryOptions, 'projectId' | 'q' | 'status' | 'industry' | 'tag'>
): Promise<number> {
    return queryDomainScansCount(userId, options);
}

/** Count across all users (ops). Enforce auth in the API layer. */
export async function getDomainScansCountAllUsers(
    options?: Pick<DomainScanListQueryOptions, 'projectId' | 'q' | 'status' | 'industry' | 'tag'>
): Promise<number> {
    return queryDomainScansCount(undefined, options);
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
