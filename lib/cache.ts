/* ------------------------------------------------------------------ */
/*  CHECKION – Server-side cache (unstable_cache + tag invalidation)   */
/*  Reduces DB load for read-heavy endpoints.                         */
/* ------------------------------------------------------------------ */

import { unstable_cache, revalidateTag } from 'next/cache';
import {
    CACHE_REVALIDATE_SCAN,
    CACHE_REVALIDATE_DOMAIN,
    CACHE_REVALIDATE_SHARE,
    CACHE_REVALIDATE_LIST,
} from '@/lib/constants';
import * as dbScans from '@/lib/db/scans';
import type { StandaloneScanListQueryOptions } from '@/lib/db/scans';
import * as dbShares from '@/lib/db/shares';
import * as dbJourneys from '@/lib/db/journeys';
import type { ScanResult, DomainScanResult, DomainScanStatus, StandaloneScanSummary } from '@/lib/types';
import { DOMAIN_SCAN_LIST_QUERY_MAX_LEN, type DomainScanSummaryRow } from '@/lib/db/scans';
import { normalizeIndustry, normalizeTagFilter } from '@/lib/tag-utils';
import type { UxCxSummary } from '@/lib/llm-summary-types';
import type { ShareLinkRow } from '@/lib/db/shares';
import type { SavedJourneyRow } from '@/lib/db/journeys';

/**
 * Segment for `unstable_cache` keys: `undefined` (no filter / all rows) must differ from
 * `null` (only `project_id IS NULL`, e.g. deep scans started outside a project).
 */
export function domainScanListProjectCacheKey(projectId: string | null | undefined): string {
    if (projectId === undefined) return 'all';
    if (projectId === null) return 'unassigned';
    return projectId;
}

/** Extra list filters for stable `unstable_cache` keys (industry + tag). */
export function domainScanListFilterCacheKey(options?: { industry?: string; tag?: string }): string {
    const i = normalizeIndustry(options?.industry ?? undefined) ?? '';
    const t = normalizeTagFilter(options?.tag) ?? '';
    return `${i}\0${t}`;
}

/** Cached: single scan by id (user-scoped). Exceeds 2MB, skipping cache. */
export async function getCachedScan(id: string, userId: string): Promise<ScanResult | null> {
    return dbScans.getScan(id, userId);
}

/** Cached: single scan with LLM summary and projectId. Exceeds 2MB, skipping cache. */
export async function getCachedScanWithSummary(
    id: string,
    userId: string
): Promise<{ result: ScanResult; llmSummary: UxCxSummary | null; projectId: string | null } | null> {
    return dbScans.getScanWithSummary(id, userId);
}

/** Cached: domain scan by id (user-scoped). Exceeds 2MB, skipping cache. */
export async function getCachedDomainScan(id: string, userId: string): Promise<DomainScanResult | null> {
    return dbScans.getDomainScan(id, userId);
}

/** Cached: share link by token (public). */
export async function getCachedShareByToken(token: string): Promise<ShareLinkRow | null> {
    return unstable_cache(
        () => dbShares.getShareByToken(token),
        ['share', token],
        { revalidate: CACHE_REVALIDATE_SHARE, tags: [`share-${token}`] }
    )();
}

/**
 * Cached: standalone scan list — **summary rows** (no full JSONB `result`).
 * Optional projectId, industry, tag (same semantics as domain scan list).
 */
export async function listCachedStandaloneScanSummaries(
    userId: string,
    options?: StandaloneScanListQueryOptions
): Promise<StandaloneScanSummary[]> {
    const limit = options?.limit ?? 10000;
    const offset = options?.offset ?? 0;
    return unstable_cache(
        () => dbScans.listStandaloneScanSummaries(userId, { ...options, limit, offset }),
        [
            'standalone-scans-summaries',
            userId,
            String(limit),
            String(offset),
            domainScanListProjectCacheKey(options?.projectId),
            domainScanListFilterCacheKey({ industry: options?.industry, tag: options?.tag }),
        ],
        { revalidate: CACHE_REVALIDATE_LIST, tags: [`scans-list-${userId}`] }
    )();
}

/** Cached: standalone scans count. */
export async function getCachedStandaloneScansCount(
    userId: string,
    options?: { projectId?: string | null; industry?: string; tag?: string }
): Promise<number> {
    return unstable_cache(
        () => dbScans.getStandaloneScansCount(userId, options),
        [
            'scans-count',
            userId,
            domainScanListProjectCacheKey(options?.projectId),
            domainScanListFilterCacheKey({ industry: options?.industry, tag: options?.tag }),
        ],
        { revalidate: CACHE_REVALIDATE_LIST, tags: [`scans-list-${userId}`] }
    )();
}

/** Cached: domain scans list – full payload (for search). Optional projectId filter. May exceed 2MB with many scans, skipping cache. */
export async function listCachedDomainScans(
    userId: string,
    options?: { limit?: number; offset?: number; projectId?: string | null }
): Promise<DomainScanResult[]> {
    const limit = options?.limit ?? 10000;
    const offset = options?.offset ?? 0;
    return dbScans.listDomainScans(userId, { limit, offset, projectId: options?.projectId });
}

/** Cached: domain scan summaries only (incl. infra-derived lines from aggregated.infra). Optional projectId / q / status filter. Stays under 2MB. */
export async function listCachedDomainScanSummaries(
    userId: string,
    options?: {
        limit?: number;
        offset?: number;
        projectId?: string | null;
        q?: string;
        status?: DomainScanStatus;
        industry?: string;
        tag?: string;
    }
): Promise<DomainScanSummaryRow[]> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    const qKey = options?.q?.trim().slice(0, DOMAIN_SCAN_LIST_QUERY_MAX_LEN) ?? '';
    const statusKey = options?.status ?? '';
    const projectKey = domainScanListProjectCacheKey(options?.projectId);
    const filterKey = domainScanListFilterCacheKey({ industry: options?.industry, tag: options?.tag });
    return unstable_cache(
        () =>
            dbScans.listDomainScanSummaries(userId, {
                limit,
                offset,
                projectId: options?.projectId,
                q: options?.q,
                status: options?.status,
                industry: options?.industry,
                tag: options?.tag,
            }),
        ['domain-summaries', 'v2', userId, String(limit), String(offset), projectKey, qKey, statusKey, filterKey],
        { revalidate: CACHE_REVALIDATE_LIST, tags: [`domain-list-${userId}`] }
    )();
}

/** Cached: domain scans count. Optional projectId / q / status filter. */
export async function getCachedDomainScansCount(
    userId: string,
    options?: {
        projectId?: string | null;
        q?: string;
        status?: DomainScanStatus;
        industry?: string;
        tag?: string;
    }
): Promise<number> {
    const qKey = options?.q?.trim().slice(0, DOMAIN_SCAN_LIST_QUERY_MAX_LEN) ?? '';
    const statusKey = options?.status ?? '';
    const projectKey = domainScanListProjectCacheKey(options?.projectId);
    const filterKey = domainScanListFilterCacheKey({ industry: options?.industry, tag: options?.tag });
    return unstable_cache(
        () =>
            dbScans.getDomainScansCount(userId, {
                projectId: options?.projectId,
                q: options?.q,
                status: options?.status,
                industry: options?.industry,
                tag: options?.tag,
            }),
        ['domain-count', userId, projectKey, qKey, statusKey, filterKey],
        { revalidate: CACHE_REVALIDATE_LIST, tags: [`domain-list-${userId}`] }
    )();
}

/** Cached: saved journeys list. */
export async function listCachedSavedJourneys(
    userId: string,
    options?: { domainScanId?: string; limit?: number; offset?: number }
): Promise<SavedJourneyRow[]> {
    const domainScanId = options?.domainScanId ?? '';
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    return unstable_cache(
        () => dbJourneys.listSavedJourneys(userId, { domainScanId: domainScanId || undefined, limit, offset }),
        ['journeys', userId, domainScanId, String(limit), String(offset)],
        { revalidate: CACHE_REVALIDATE_LIST, tags: [`journeys-${userId}`, domainScanId ? `journeys-${userId}-${domainScanId}` : ''].filter(Boolean) }
    )();
}

/** Cached: saved journeys count. */
export async function getCachedSavedJourneysCount(userId: string, domainScanId?: string): Promise<number> {
    return unstable_cache(
        () => dbJourneys.getSavedJourneysCount(userId, domainScanId),
        ['journeys-count', userId, domainScanId ?? ''],
        { revalidate: CACHE_REVALIDATE_LIST, tags: [`journeys-${userId}`, domainScanId ? `journeys-${userId}-${domainScanId}` : ''].filter(Boolean) }
    )();
}

/* ---------- Invalidation (call after mutations) ---------- */

/** Profile "max" = stale-while-revalidate (Next.js 16). */
const REVALIDATE_PROFILE = 'max' as const;

/** True when `revalidateTag` runs outside a Next.js request/static-generation context (e.g. Docker entrypoint scripts). */
export function isOutsideNextCacheContextError(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return msg.includes('static generation store missing');
}

function safeRevalidateTag(tag: string): void {
    try {
        revalidateTag(tag, REVALIDATE_PROFILE);
    } catch (e) {
        if (isOutsideNextCacheContextError(e)) return;
        throw e;
    }
}

export function invalidateScan(id: string): void {
    safeRevalidateTag(`scan-${id}`);
}

export function invalidateDomainScan(id: string): void {
    safeRevalidateTag(`domain-${id}`);
}

export function invalidateShare(token: string): void {
    safeRevalidateTag(`share-${token}`);
}

export function invalidateScansList(userId: string): void {
    safeRevalidateTag(`scans-list-${userId}`);
}

export function invalidateDomainList(userId: string): void {
    safeRevalidateTag(`domain-list-${userId}`);
}

export function invalidateJourneys(userId: string, domainScanId?: string): void {
    safeRevalidateTag(`journeys-${userId}`);
    if (domainScanId) safeRevalidateTag(`journeys-${userId}-${domainScanId}`);
}
