/* ------------------------------------------------------------------ */
/*  CHECKION – Scan persistence (DB)                                   */
/* ------------------------------------------------------------------ */

import { eq, and, desc, isNull, count, sql, inArray, ilike, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { getDb } from './index';
import { scans, domainScans, projects, scanSessions, standaloneScanEntitlements } from './schema';
import { mergeScanResultPatch, normalizeScanResultForPersist } from '@/lib/scan-result-shape';
import { coerceJsonStringArray, normalizeIndustry, normalizeTagFilter, normalizeTagList } from '@/lib/tag-utils';
import { getProjectDomainScanReferences } from './project-domain-references';
import type { ScanResult, DomainScanResult, DomainScanStatus, StandaloneScanSummary } from '@/lib/types';
import type { UxCxSummary } from '@/lib/llm-summary-types';
import type { UxCheckV2Summary } from '@/lib/ux-check-types';
import { normalizeScanUrl } from '@/lib/url-normalize';
import { buildDomainScanLineageKey } from '@/lib/domain-scan-lineage';
import { getProject } from './projects';
import { replaceScanIssuesForScan } from '@/lib/db/scan-issues-persist';
import { formatDeepScanInfraListLines } from '@/lib/deep-scan-list-summary';
import { normalizeStoredProjectIndustry } from '@/lib/industry-pool';

/**
 * Drop heavy top-level keys in SQL (Postgres `jsonb - key`) for bulk reads.
 * Keeps issues/seo/ux for aggregation & search; omits image blobs and axe `passes` (often large).
 * Not used for {@link getScan} or {@link listScansByGroupId} (full row for API thumbnails).
 */
const scanResultForBulkRead = sql<ScanResult>`(${scans.result})::jsonb - 'screenshot' - 'saliencyHeatmap' - 'passes'`;

/** For GET /api/search over domain page rows: slimmer JSON than bulk read (see `searchInScan` fields). */
const scanResultForSearch = sql<ScanResult>`(${scans.result})::jsonb
  - 'screenshot' - 'saliencyHeatmap' - 'passes'
  - 'performance' - 'eco' - 'ux' - 'links' - 'geo' - 'privacy' - 'consentSignals'
  - 'eeatSignals' - 'generative' - 'security' - 'technicalInsights' - 'llmSummary'
  - 'scanpath' - 'bodyTextExcerpt' - 'ymyl' - 'pageClassification' - 'contentFreshness'
  - 'documentCacheHints' - 'allLinks' - 'allLinksWithLabels' - 'runners'`;

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
    /** `coalesce(projects.industry, domain_scans.industry)` — project wins when both set. */
    industry: string | null;
    projectTags: string[];
    /** Scan-level tags (union with project tags for filters). */
    tags: string[];
    /**
     * Derived from `payload.aggregated.infra` when present (typically complete scans).
     * Omitted or null fields when aggregate missing (queued/error/legacy).
     */
    platformsLine?: string | null;
    infraLine?: string | null;
    privacyLine?: string | null;
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
    /** Exact match on `coalesce(domain_scans.industry, projects.industry)`. */
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
        parts.push(sql`coalesce(${domainScans.industry}, ${projects.industry}) = ${ind}`);
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

/** Maps DB row to API list shape (no JSONB `result`). Exported for tests. */
export function mapRowToStandaloneScanSummary(row: {
    id: string;
    url: string;
    timestamp: string;
    score: number | null;
    errorsCount: number | null;
    warningsCount: number | null;
    noticesCount: number | null;
    projectId: string | null;
    groupId: string | null;
    scanSessionId: string | null;
    device: string;
    targetRegion: string | null;
    scanTagsJson: unknown;
    projectTagsJson: unknown;
    industry: string | null;
}): StandaloneScanSummary {
    const errors = Number(row.errorsCount ?? 0);
    const warnings = Number(row.warningsCount ?? 0);
    const notices = Number(row.noticesCount ?? 0);
    return {
        id: row.id,
        url: row.url,
        timestamp: row.timestamp,
        score: Math.round(Number(row.score ?? 0)),
        stats: {
            errors,
            warnings,
            notices,
            total: errors + warnings + notices,
        },
        projectId: row.projectId,
        groupId: row.groupId,
        scanSessionId: row.scanSessionId,
        device: row.device as StandaloneScanSummary['device'],
        tags: coerceJsonStringArray(row.scanTagsJson),
        projectTags: coerceJsonStringArray(row.projectTagsJson),
        industry: row.industry?.trim() ? row.industry : null,
        targetRegion: row.targetRegion?.trim() ? row.targetRegion : null,
    };
}

/** Insert `scan_sessions` before persisting device rows (POST /api/scan). */
export async function insertScanSession(row: {
    id: string;
    userId: string;
    url: string;
    projectId?: string | null;
    standard?: string | null;
    runners?: unknown;
    targetRegion?: string | null;
}): Promise<void> {
    const db = getDb();
    await db.insert(scanSessions).values({
        id: row.id,
        userId: row.userId,
        projectId: row.projectId ?? null,
        url: row.url,
        standard: row.standard ?? null,
        runners: row.runners != null ? (row.runners as Record<string, unknown>) : null,
        targetRegion: row.targetRegion?.trim() ? row.targetRegion.trim() : null,
    });
}

/**
 * Persist one page scan row (standalone or domain crawl). Normalizes JSON + index columns.
 * For POST /api/scan batches, pass `scanSessionId` equal to `result.groupId`.
 */
export async function addScan(
    userId: string,
    result: ScanResult,
    options?: { projectId?: string | null; scanSessionId?: string | null; tags?: string[] }
): Promise<void> {
    const db = getDb();
    const normalized = normalizeScanResultForPersist(result);
    await db.transaction(async (tx) => {
        await tx.insert(scans).values({
            id: normalized.id,
            userId,
            projectId: options?.projectId ?? null,
            url: normalized.url,
            device: normalized.device,
            groupId: normalized.groupId ?? null,
            scanSessionId: options?.scanSessionId ?? null,
            timestamp: normalized.timestamp,
            result: normalized as unknown as Record<string, unknown>,
            resultSchemaVersion: normalized.scanSchemaVersion ?? null,
            errorsCount: normalized.stats.errors,
            warningsCount: normalized.stats.warnings,
            noticesCount: normalized.stats.notices,
            durationMs: normalized.durationMs,
            score: Math.round(normalized.score),
            tags: normalizeTagList(options?.tags ?? []),
        });
        await replaceScanIssuesForScan(tx, userId, normalized.id, normalized.issues);
    });
}

/** Standalone-only: session row must already exist. */
export async function persistStandaloneScanRow(
    userId: string,
    result: ScanResult,
    options: { projectId?: string | null; scanSessionId: string; tags?: string[] }
): Promise<void> {
    await addScan(userId, result, {
        projectId: options.projectId,
        scanSessionId: options.scanSessionId,
        tags: options.tags,
    });
}

export async function getScan(id: string, userId: string): Promise<ScanResult | null> {
    const db = getDb();
    const own = await db.select({ result: scans.result }).from(scans).where(and(eq(scans.id, id), eq(scans.userId, userId))).limit(1);
    if (own.length > 0) return own[0].result as unknown as ScanResult;

    const borrowed = await db
        .select({ result: scans.result })
        .from(standaloneScanEntitlements)
        .innerJoin(scans, eq(scans.id, standaloneScanEntitlements.canonicalDesktopScanId))
        .where(and(eq(standaloneScanEntitlements.userId, userId), eq(standaloneScanEntitlements.canonicalDesktopScanId, id)))
        .limit(1);
    if (borrowed.length > 0) return borrowed[0].result as unknown as ScanResult;
    return null;
}

/** Returns scan result plus llm_summary and projectId for API response. */
export async function getScanWithSummary(id: string, userId: string): Promise<{ result: ScanResult; llmSummary: UxCxSummary | null; projectId: string | null } | null> {
    const db = getDb();
    const own = await db
        .select({
            result: scans.result,
            llmSummary: scans.llmSummary,
            projectId: scans.projectId,
        })
        .from(scans)
        .where(and(eq(scans.id, id), eq(scans.userId, userId)))
        .limit(1);
    if (own.length > 0) {
        return {
            result: own[0].result as unknown as ScanResult,
            llmSummary: (own[0].llmSummary as UxCxSummary | null) ?? null,
            projectId: own[0].projectId ?? null,
        };
    }

    const borrowed = await db
        .select({
            result: scans.result,
            llmSummary: scans.llmSummary,
            projectId: standaloneScanEntitlements.projectId,
        })
        .from(standaloneScanEntitlements)
        .innerJoin(scans, eq(scans.id, standaloneScanEntitlements.canonicalDesktopScanId))
        .where(and(eq(standaloneScanEntitlements.userId, userId), eq(standaloneScanEntitlements.canonicalDesktopScanId, id)))
        .limit(1);
    if (borrowed.length === 0) return null;
    return {
        result: borrowed[0].result as unknown as ScanResult,
        llmSummary: (borrowed[0].llmSummary as UxCxSummary | null) ?? null,
        projectId: borrowed[0].projectId ?? null,
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
    const merged = mergeScanResultPatch(current, patch);
    return await db.transaction(async (tx) => {
        const updated = await tx
            .update(scans)
            .set({
                result: merged as unknown as Record<string, unknown>,
                resultSchemaVersion: merged.scanSchemaVersion ?? null,
                errorsCount: merged.stats.errors,
                warningsCount: merged.stats.warnings,
                noticesCount: merged.stats.notices,
                durationMs: merged.durationMs,
                score: Math.round(merged.score),
            })
            .where(and(eq(scans.id, id), eq(scans.userId, userId)));
        if ((updated.rowCount ?? 0) === 0) return false;
        await replaceScanIssuesForScan(tx, userId, id, merged.issues);
        return true;
    });
}

export async function listScans(userId: string): Promise<ScanResult[]> {
    const db = getDb();
    const rows = await db.select({ result: scans.result }).from(scans).where(eq(scans.userId, userId)).orderBy(desc(scans.timestamp));
    return rows.map(r => r.result as unknown as ScanResult);
}

/** Rows that are not domain-crawl pages: `group_id` null or not a `domain_scans.id`. One list row per multi-device batch (`desktop` only when `group_id` set). */
function standaloneScanBaseWhere(userId: string, projectId?: string | null): SQL {
    const notDomainCrawlPage = or(
        isNull(scans.groupId),
        sql`NOT EXISTS (SELECT 1 FROM ${domainScans} WHERE ${domainScans.id} = ${scans.groupId})`
    )!;
    const oneDevicePerBatch = or(isNull(scans.groupId), eq(scans.device, 'desktop'))!;
    if (projectId === undefined) {
        return and(eq(scans.userId, userId), notDomainCrawlPage, oneDevicePerBatch)!;
    }
    if (projectId === null) {
        return and(eq(scans.userId, userId), notDomainCrawlPage, oneDevicePerBatch, isNull(scans.projectId))!;
    }
    return and(eq(scans.userId, userId), notDomainCrawlPage, oneDevicePerBatch, eq(scans.projectId, projectId))!;
}

/** Standalone dashboard list: base filters + optional industry / tag (scan ∪ project tags). Requires `projects` join. */
export function buildStandaloneScanSummaryWhere(
    userId: string,
    options?: { projectId?: string | null; industry?: string; tag?: string }
): SQL {
    let cond = standaloneScanBaseWhere(userId, options?.projectId);
    const ind = normalizeIndustry(options?.industry ?? undefined);
    const tag = normalizeTagFilter(options?.tag);
    if (ind) {
        cond = and(cond, eq(projects.industry, ind))!;
    }
    if (tag) {
        const jsonbLiteral = `'${JSON.stringify([tag]).replace(/'/g, "''")}'::jsonb`;
        cond = and(
            cond,
            sql`(coalesce(${scans.tags}, '[]'::jsonb) @> ${sql.raw(jsonbLiteral)} OR coalesce(${projects.tags}, '[]'::jsonb) @> ${sql.raw(jsonbLiteral)})`
        )!;
    }
    return cond;
}

/** Filters for rows visible via {@link standaloneScanEntitlements} (viewer’s project + industry/tag). */
export function buildBorrowedStandaloneScanSummaryWhere(
    userId: string,
    options?: { projectId?: string | null; industry?: string; tag?: string }
): SQL {
    const parts: SQL[] = [eq(standaloneScanEntitlements.userId, userId)];
    const pid = options?.projectId;
    if (pid === undefined) {
        /* all projects */
    } else if (pid === null) {
        parts.push(isNull(standaloneScanEntitlements.projectId));
    } else {
        parts.push(eq(standaloneScanEntitlements.projectId, pid));
    }
    const ind = normalizeIndustry(options?.industry ?? undefined);
    if (ind) {
        parts.push(eq(projects.industry, ind));
    }
    const tag = normalizeTagFilter(options?.tag);
    if (tag) {
        const jsonbLiteral = `'${JSON.stringify([tag]).replace(/'/g, "''")}'::jsonb`;
        parts.push(
            sql`(coalesce(${scans.tags}, '[]'::jsonb) @> ${sql.raw(jsonbLiteral)} OR coalesce(${projects.tags}, '[]'::jsonb) @> ${sql.raw(jsonbLiteral)})`
        );
    }
    return parts.length === 1 ? parts[0] : and(...parts)!;
}

export type StandaloneScanListQueryOptions = {
    limit?: number;
    offset?: number;
    projectId?: string | null;
    industry?: string;
    tag?: string;
};

const STANDALONE_LIST_MERGE_CAP = 8000;

async function listOwnedStandaloneScanSummaries(
    userId: string,
    options?: StandaloneScanListQueryOptions
): Promise<StandaloneScanSummary[]> {
    const db = getDb();
    const whereCond = buildStandaloneScanSummaryWhere(userId, {
        projectId: options?.projectId,
        industry: options?.industry,
        tag: options?.tag,
    });
    const base = db
        .select({
            id: scans.id,
            url: scans.url,
            timestamp: scans.timestamp,
            score: scans.score,
            errorsCount: scans.errorsCount,
            warningsCount: scans.warningsCount,
            noticesCount: scans.noticesCount,
            projectId: scans.projectId,
            groupId: scans.groupId,
            scanSessionId: scans.scanSessionId,
            device: scans.device,
            targetRegion: scanSessions.targetRegion,
            scanTagsJson: scans.tags,
            projectTagsJson: projects.tags,
            industry: projects.industry,
        })
        .from(scans)
        .leftJoin(projects, eq(scans.projectId, projects.id))
        .leftJoin(scanSessions, eq(scans.scanSessionId, scanSessions.id))
        .where(whereCond)
        .orderBy(desc(scans.timestamp));
    const rows =
        options?.limit != null || options?.offset != null
            ? await base.limit(options.limit ?? 10000).offset(options.offset ?? 0)
            : await base;
    return rows.map((r) =>
        mapRowToStandaloneScanSummary({
            ...r,
            targetRegion: r.targetRegion ?? null,
        })
    );
}

/**
 * Standalone rows linked via {@link standaloneScanEntitlements} (reused canonical scan).
 */
export async function listBorrowedStandaloneScanSummaries(
    userId: string,
    options?: StandaloneScanListQueryOptions
): Promise<StandaloneScanSummary[]> {
    const db = getDb();
    const whereCond = buildBorrowedStandaloneScanSummaryWhere(userId, {
        projectId: options?.projectId,
        industry: options?.industry,
        tag: options?.tag,
    });
    const base = db
        .select({
            id: scans.id,
            url: scans.url,
            timestamp: scans.timestamp,
            score: scans.score,
            errorsCount: scans.errorsCount,
            warningsCount: scans.warningsCount,
            noticesCount: scans.noticesCount,
            projectId: standaloneScanEntitlements.projectId,
            groupId: scans.groupId,
            scanSessionId: scans.scanSessionId,
            device: scans.device,
            targetRegion: scanSessions.targetRegion,
            scanTagsJson: scans.tags,
            projectTagsJson: projects.tags,
            industry: projects.industry,
        })
        .from(standaloneScanEntitlements)
        .innerJoin(scans, eq(scans.id, standaloneScanEntitlements.canonicalDesktopScanId))
        .leftJoin(scanSessions, eq(scanSessions.id, scans.scanSessionId))
        .leftJoin(projects, eq(projects.id, standaloneScanEntitlements.projectId))
        .where(whereCond)
        .orderBy(desc(scans.timestamp));
    const rows =
        options?.limit != null || options?.offset != null
            ? await base.limit(options.limit ?? 10000).offset(options.offset ?? 0)
            : await base;
    return rows.map((r) =>
        mapRowToStandaloneScanSummary({
            ...r,
            targetRegion: r.targetRegion ?? null,
        })
    );
}

/**
 * Paginated standalone list for dashboard — columns only (fast). One desktop row per batch when `group_id` set.
 * Merges owned scans with borrowed (cross-user reuse) rows, then sorts by timestamp.
 */
export async function listStandaloneScanSummaries(
    userId: string,
    options?: StandaloneScanListQueryOptions
): Promise<StandaloneScanSummary[]> {
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 10000;
    const owned = await listOwnedStandaloneScanSummaries(userId, {
        ...options,
        limit: STANDALONE_LIST_MERGE_CAP,
        offset: 0,
    });
    const borrowed = await listBorrowedStandaloneScanSummaries(userId, {
        ...options,
        limit: STANDALONE_LIST_MERGE_CAP,
        offset: 0,
    });
    const merged = [...owned, ...borrowed].sort((a, b) => {
        if (a.timestamp < b.timestamp) return 1;
        if (a.timestamp > b.timestamp) return -1;
        return 0;
    });
    return merged.slice(offset, offset + limit);
}

/**
 * Full `ScanResult` JSON per row — expensive; use for search indexing or rare bulk export.
 * Prefer {@link listStandaloneScanSummaries} for lists.
 */
export async function listStandaloneScansFull(
    userId: string,
    options?: StandaloneScanListQueryOptions
): Promise<ScanResult[]> {
    const db = getDb();
    const whereCond = buildStandaloneScanSummaryWhere(userId, {
        projectId: options?.projectId,
        industry: options?.industry,
        tag: options?.tag,
    });
    const base = db
        .select({ result: scanResultForBulkRead })
        .from(scans)
        .leftJoin(projects, eq(scans.projectId, projects.id))
        .where(whereCond)
        .orderBy(desc(scans.timestamp));
    const rows =
        options?.limit != null || options?.offset != null
            ? await base.limit(options.limit ?? 10000).offset(options.offset ?? 0)
            : await base;
    return rows.map((r) => r.result as unknown as ScanResult);
}

/** All single-scan results belonging to a domain (deep) scan; for journey/buildPageContexts. */
export async function listScansByGroupId(userId: string, groupId: string): Promise<ScanResult[]> {
    const db = getDb();
    const access = or(
        eq(scans.userId, userId),
        sql`exists (
            select 1 from standalone_scan_entitlements e
            where e.user_id = ${userId}
            and e.scan_session_id = ${scans.scanSessionId}
        )`
    );
    const rows = await db
        .select({ result: scans.result })
        .from(scans)
        .where(and(eq(scans.groupId, groupId), access));
    return rows.map((r) => r.result as unknown as ScanResult);
}

/**
 * Same as {@link listScansByGroupId} but drops `screenshot`, `saliencyHeatmap`, and `passes` in SQL.
 * Use for aggregation refresh, search, LLM jobs — not for API responses that may show thumbnails.
 */
export async function listScansByGroupIdOmitImageBlobs(
    userId: string,
    groupId: string
): Promise<ScanResult[]> {
    const db = getDb();
    const access = or(
        eq(scans.userId, userId),
        sql`exists (
            select 1 from standalone_scan_entitlements e
            where e.user_id = ${userId}
            and e.scan_session_id = ${scans.scanSessionId}
        )`
    );
    const rows = await db
        .select({ result: scanResultForBulkRead })
        .from(scans)
        .where(and(eq(scans.groupId, groupId), access));
    return rows.map((r) => r.result as unknown as ScanResult);
}

/**
 * Like {@link listScansByGroupIdOmitImageBlobs} but with a slimmer JSON projection for dashboard search only.
 */
export async function listScansByGroupIdForSearch(userId: string, groupId: string): Promise<ScanResult[]> {
    const db = getDb();
    const access = or(
        eq(scans.userId, userId),
        sql`exists (
            select 1 from standalone_scan_entitlements e
            where e.user_id = ${userId}
            and e.scan_session_id = ${scans.scanSessionId}
        )`
    );
    const rows = await db
        .select({ result: scanResultForSearch })
        .from(scans)
        .where(and(eq(scans.groupId, groupId), access));
    return rows.map((r) => r.result as unknown as ScanResult);
}

export async function getStandaloneScansCount(
    userId: string,
    options?: { projectId?: string | null; industry?: string; tag?: string }
): Promise<number> {
    const db = getDb();
    const whereOwned = buildStandaloneScanSummaryWhere(userId, {
        projectId: options?.projectId,
        industry: options?.industry,
        tag: options?.tag,
    });
    const ownedRows = await db
        .select({ count: count() })
        .from(scans)
        .leftJoin(projects, eq(scans.projectId, projects.id))
        .where(whereOwned);
    const whereBorrowed = buildBorrowedStandaloneScanSummaryWhere(userId, {
        projectId: options?.projectId,
        industry: options?.industry,
        tag: options?.tag,
    });
    const borrowedRows = await db
        .select({ count: count() })
        .from(standaloneScanEntitlements)
        .innerJoin(scans, eq(scans.id, standaloneScanEntitlements.canonicalDesktopScanId))
        .leftJoin(projects, eq(projects.id, standaloneScanEntitlements.projectId))
        .where(whereBorrowed);
    return Number(ownedRows[0]?.count ?? 0) + Number(borrowedRows[0]?.count ?? 0);
}

export async function updateScanProject(scanId: string, userId: string, projectId: string | null): Promise<boolean> {
    const db = getDb();
    const rows = await db
        .select({ groupId: scans.groupId })
        .from(scans)
        .where(and(eq(scans.id, scanId), eq(scans.userId, userId)))
        .limit(1);
    if (rows.length === 0) {
        if (projectId) {
            const project = await getProject(projectId, userId);
            if (!project) return false;
        }
        const entUpdated = await db
            .update(standaloneScanEntitlements)
            .set({ projectId })
            .where(
                and(
                    eq(standaloneScanEntitlements.userId, userId),
                    eq(standaloneScanEntitlements.canonicalDesktopScanId, scanId)
                )
            );
        return (entUpdated.rowCount ?? 0) > 0;
    }

    let tags: string[] = [];
    if (projectId) {
        const project = await getProject(projectId, userId);
        if (!project) return false;
        tags = normalizeTagList(project.tags);
    }

    const payload = { projectId, tags };
    const gid = rows[0].groupId;
    if (gid) {
        const updated = await db.update(scans).set(payload).where(and(eq(scans.userId, userId), eq(scans.groupId, gid)));
        return (updated.rowCount ?? 0) > 0;
    }
    const updated = await db.update(scans).set(payload).where(and(eq(scans.id, scanId), eq(scans.userId, userId)));
    return (updated.rowCount ?? 0) > 0;
}

/** Set scan-level tags on all device rows sharing `group_id` (or single row). */
export async function updateStandaloneScanTags(scanId: string, userId: string, tags: string[]): Promise<boolean> {
    const db = getDb();
    const normalized = normalizeTagList(tags);
    const rows = await db
        .select({ groupId: scans.groupId })
        .from(scans)
        .where(and(eq(scans.id, scanId), eq(scans.userId, userId)))
        .limit(1);
    if (rows.length === 0) return false;
    const gid = rows[0].groupId;
    if (gid) {
        const updated = await db
            .update(scans)
            .set({ tags: normalized })
            .where(and(eq(scans.userId, userId), eq(scans.groupId, gid)));
        return (updated.rowCount ?? 0) > 0;
    }
    const updated = await db
        .update(scans)
        .set({ tags: normalized })
        .where(and(eq(scans.id, scanId), eq(scans.userId, userId)));
    return (updated.rowCount ?? 0) > 0;
}

export async function deleteScan(id: string, userId: string): Promise<boolean> {
    const db = getDb();
    const delEnt = await db
        .delete(standaloneScanEntitlements)
        .where(and(eq(standaloneScanEntitlements.userId, userId), eq(standaloneScanEntitlements.canonicalDesktopScanId, id)));
    if ((delEnt.rowCount ?? 0) > 0) return true;
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

/** Single JSONB slice — avoids loading full `domain_scans.payload` for the visual map tab. */
export async function getDomainScanGraph(id: string, userId: string): Promise<DomainScanResult['graph'] | null> {
    const db = getDb();
    const rows = await db
        .select({
            graphJson: sql<unknown>`${domainScans.payload}->'graph'`,
        })
        .from(domainScans)
        .where(and(eq(domainScans.id, id), eq(domainScans.userId, userId)))
        .limit(1);
    if (rows.length === 0) return null;
    const raw = rows[0].graphJson;
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
        return { nodes: [], links: [] };
    }
    const g = raw as { nodes?: unknown; links?: unknown };
    const nodes = Array.isArray(g.nodes) ? g.nodes : [];
    const links = Array.isArray(g.links) ? g.links : [];
    return { nodes, links } as DomainScanResult['graph'];
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
            industry: sql<string | null>`coalesce(${projects.industry}, ${domainScans.industry})`,
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

/** Scan row meta for classification auto-fill (no full payload). */
export async function getDomainScanClassificationColumns(
    id: string,
    userId: string
): Promise<{ domain: string; tags: string[]; industry: string | null } | null> {
    const db = getDb();
    const rows = await db
        .select({
            domain: domainScans.domain,
            tags: domainScans.tags,
            industry: domainScans.industry,
        })
        .from(domainScans)
        .where(and(eq(domainScans.id, id), eq(domainScans.userId, userId)))
        .limit(1);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
        domain: r.domain,
        tags: coerceJsonStringArray(r.tags),
        industry: r.industry?.trim() ? r.industry.trim() : null,
    };
}

export async function updateDomainScanIndustry(id: string, userId: string, industry: string | null): Promise<boolean> {
    const db = getDb();
    const normalized = normalizeStoredProjectIndustry(industry ?? undefined);
    const updated = await db
        .update(domainScans)
        .set({ industry: normalized })
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
            aggregatedInfra: sql<unknown>`${domainScans.payload}->'aggregated'->'infra'`,
            lineageVersion: domainScans.lineageVersion,
            projectId: domainScans.projectId,
            userId: domainScans.userId,
            industry: sql<string | null>`coalesce(${projects.industry}, ${domainScans.industry})`,
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
    return rows.map((r) => {
        const lines = formatDeepScanInfraListLines(r.aggregatedInfra);
        return {
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
            platformsLine: lines.platformsLine,
            infraLine: lines.infraLine,
            privacyLine: lines.privacyLine,
        };
    });
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
            industry: sql<string | null>`coalesce(${projects.industry}, ${domainScans.industry})`,
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
    /** Project URL + hints only — avoid loading 200× full `result` JSON; load one full row on match for reuse. */
    const rows = await db
        .select({
            id: scans.id,
            projectId: scans.projectId,
            urlFromResult: sql<string | null>`(${scans.result})::jsonb->>'url'`,
            hintsJson: sql<unknown>`(${scans.result})::jsonb->'documentCacheHints'`,
        })
        .from(scans)
        .where(and(eq(scans.userId, userId), eq(scans.device, device)))
        .orderBy(desc(scans.timestamp))
        .limit(FINGERPRINT_SCAN_LOOKBACK);

    for (const row of rows) {
        const urlRaw = row.urlFromResult ?? '';
        if (normalizeScanUrl(urlRaw) !== normalizedUrl) continue;

        if (projectId === undefined) {
            // any project
        } else if (projectId === null) {
            if (row.projectId != null) continue;
        } else if (row.projectId !== projectId) {
            continue;
        }

        const hints = row.hintsJson as ScanResult['documentCacheHints'] | null;
        const etag = hints?.etag?.trim();
        const lastModified = hints?.lastModified?.trim();
        if (!etag && !lastModified) continue;

        const full = await getScan(row.id, userId);
        if (!full) continue;

        return {
            documentCacheHints: {
                ...(etag ? { etag } : {}),
                ...(lastModified ? { lastModified } : {}),
            },
            scanResult: full,
        };
    }
    return null;
}
