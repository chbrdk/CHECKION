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
import * as dbShares from '@/lib/db/shares';
import * as dbJourneys from '@/lib/db/journeys';
import type { ScanResult, DomainScanResult } from '@/lib/types';
import type { UxCxSummary } from '@/lib/llm-summary-types';
import type { ShareLinkRow } from '@/lib/db/shares';
import type { SavedJourneyRow } from '@/lib/db/journeys';

/** Cached: single scan by id (user-scoped). */
export async function getCachedScan(id: string, userId: string): Promise<ScanResult | null> {
    return unstable_cache(
        () => dbScans.getScan(id, userId),
        ['scan', id, userId],
        { revalidate: CACHE_REVALIDATE_SCAN, tags: [`scan-${id}`] }
    )();
}

/** Cached: single scan with LLM summary. */
export async function getCachedScanWithSummary(
    id: string,
    userId: string
): Promise<{ result: ScanResult; llmSummary: UxCxSummary | null } | null> {
    return unstable_cache(
        () => dbScans.getScanWithSummary(id, userId),
        ['scan-summary', id, userId],
        { revalidate: CACHE_REVALIDATE_SCAN, tags: [`scan-${id}`] }
    )();
}

/** Cached: domain scan by id (user-scoped). */
export async function getCachedDomainScan(id: string, userId: string): Promise<DomainScanResult | null> {
    return unstable_cache(
        () => dbScans.getDomainScan(id, userId),
        ['domain', id, userId],
        { revalidate: CACHE_REVALIDATE_DOMAIN, tags: [`domain-${id}`] }
    )();
}

/** Cached: share link by token (public). */
export async function getCachedShareByToken(token: string): Promise<ShareLinkRow | null> {
    return unstable_cache(
        () => dbShares.getShareByToken(token),
        ['share', token],
        { revalidate: CACHE_REVALIDATE_SHARE, tags: [`share-${token}`] }
    )();
}

/** Cached: standalone scans list (paginated). */
export async function listCachedStandaloneScans(
    userId: string,
    options?: { limit?: number; offset?: number }
): Promise<ScanResult[]> {
    const limit = options?.limit ?? 10000;
    const offset = options?.offset ?? 0;
    return unstable_cache(
        () => dbScans.listStandaloneScans(userId, { limit, offset }),
        ['scans-standalone', userId, String(limit), String(offset)],
        { revalidate: CACHE_REVALIDATE_LIST, tags: [`scans-list-${userId}`] }
    )();
}

/** Cached: standalone scans count. */
export async function getCachedStandaloneScansCount(userId: string): Promise<number> {
    return unstable_cache(
        () => dbScans.getStandaloneScansCount(userId),
        ['scans-count', userId],
        { revalidate: CACHE_REVALIDATE_LIST, tags: [`scans-list-${userId}`] }
    )();
}

/** Cached: domain scans list (paginated). */
export async function listCachedDomainScans(
    userId: string,
    options?: { limit?: number; offset?: number }
): Promise<DomainScanResult[]> {
    const limit = options?.limit ?? 10000;
    const offset = options?.offset ?? 0;
    return unstable_cache(
        () => dbScans.listDomainScans(userId, { limit, offset }),
        ['domain-list', userId, String(limit), String(offset)],
        { revalidate: CACHE_REVALIDATE_LIST, tags: [`domain-list-${userId}`] }
    )();
}

/** Cached: domain scans count. */
export async function getCachedDomainScansCount(userId: string): Promise<number> {
    return unstable_cache(
        () => dbScans.getDomainScansCount(userId),
        ['domain-count', userId],
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

export function invalidateScan(id: string): void {
    revalidateTag(`scan-${id}`, REVALIDATE_PROFILE);
}

export function invalidateDomainScan(id: string): void {
    revalidateTag(`domain-${id}`, REVALIDATE_PROFILE);
}

export function invalidateShare(token: string): void {
    revalidateTag(`share-${token}`, REVALIDATE_PROFILE);
}

export function invalidateScansList(userId: string): void {
    revalidateTag(`scans-list-${userId}`, REVALIDATE_PROFILE);
}

export function invalidateDomainList(userId: string): void {
    revalidateTag(`domain-list-${userId}`, REVALIDATE_PROFILE);
}

export function invalidateJourneys(userId: string, domainScanId?: string): void {
    revalidateTag(`journeys-${userId}`, REVALIDATE_PROFILE);
    if (domainScanId) revalidateTag(`journeys-${userId}-${domainScanId}`, REVALIDATE_PROFILE);
}
