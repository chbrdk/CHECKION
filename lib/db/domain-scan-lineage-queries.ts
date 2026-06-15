/**
 * Lineage helpers for resolving previous domain scans in a version chain.
 */

import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { domainScans } from '@/lib/db/schema';

export interface DomainScanLineageMeta {
    scanId: string;
    lineageKey: string;
    lineageVersion: number;
    domain: string;
    status: string;
    timestamp: string;
}

export async function getDomainScanLineageMeta(
    scanId: string,
    userId: string,
): Promise<DomainScanLineageMeta | null> {
    const db = getDb();
    const rows = await db
        .select({
            scanId: domainScans.id,
            lineageKey: domainScans.lineageKey,
            lineageVersion: domainScans.lineageVersion,
            domain: domainScans.domain,
            status: domainScans.status,
            timestamp: domainScans.timestamp,
        })
        .from(domainScans)
        .where(and(eq(domainScans.id, scanId), eq(domainScans.userId, userId)))
        .limit(1);

    const row = rows[0];
    if (!row) return null;

    const lineageKey = row.lineageKey ?? row.scanId;
    return {
        scanId: row.scanId,
        lineageKey,
        lineageVersion: row.lineageVersion ?? 1,
        domain: row.domain,
        status: row.status,
        timestamp: row.timestamp,
    };
}

export async function getPreviousDomainScanId(
    userId: string,
    currentScanId: string,
): Promise<string | null> {
    const meta = await getDomainScanLineageMeta(currentScanId, userId);
    if (!meta || meta.lineageVersion <= 1) return null;

    const db = getDb();
    const prevVersion = meta.lineageVersion - 1;
    const rows = await db
        .select({ id: domainScans.id })
        .from(domainScans)
        .where(
            and(
                eq(domainScans.userId, userId),
                eq(domainScans.lineageKey, meta.lineageKey),
                eq(domainScans.lineageVersion, prevVersion),
                eq(domainScans.status, 'complete'),
            ),
        )
        .limit(1);

    return rows[0]?.id ?? null;
}

export async function getDomainScanTimestamp(
    scanId: string,
    userId: string,
): Promise<string | null> {
    const meta = await getDomainScanLineageMeta(scanId, userId);
    return meta?.timestamp ?? null;
}

/** Aggregated pageClassification slice from domain scan payload. */
export async function getDomainScanAggregatedPageClassification(
    scanId: string,
    userId: string,
): Promise<unknown | null> {
    const db = getDb();
    const rows = await db
        .select({
            raw: sql<unknown>`(${domainScans.payload})::jsonb->'aggregated'->'pageClassification'`,
        })
        .from(domainScans)
        .where(and(eq(domainScans.id, scanId), eq(domainScans.userId, userId)))
        .limit(1);
    return rows[0]?.raw ?? null;
}
