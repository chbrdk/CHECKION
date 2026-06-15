/**
 * Persist and load domain scan diffs (consecutive lineage versions).
 */

import { and, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { domainScanDiffs } from '@/lib/db/schema';
import type { DomainScanDiffResult } from '@/lib/domain-scan-diff';

export async function upsertDomainScanDiff(
    userId: string,
    diff: DomainScanDiffResult,
): Promise<void> {
    const db = getDb();
    await db
        .insert(domainScanDiffs)
        .values({
            currentDomainScanId: diff.currentScanId,
            previousDomainScanId: diff.previousScanId,
            userId,
            lineageKey: diff.lineageKey,
            computedAt: new Date(diff.comparedAt),
            payload: diff as unknown as Record<string, unknown>,
        })
        .onConflictDoUpdate({
            target: domainScanDiffs.currentDomainScanId,
            set: {
                previousDomainScanId: diff.previousScanId,
                lineageKey: diff.lineageKey,
                computedAt: new Date(diff.comparedAt),
                payload: diff as unknown as Record<string, unknown>,
            },
        });
}

export async function getDomainScanDiffForUser(
    currentDomainScanId: string,
    userId: string,
): Promise<DomainScanDiffResult | null> {
    const db = getDb();
    const rows = await db
        .select({ payload: domainScanDiffs.payload })
        .from(domainScanDiffs)
        .where(
            and(
                eq(domainScanDiffs.currentDomainScanId, currentDomainScanId),
                eq(domainScanDiffs.userId, userId),
            ),
        )
        .limit(1);
    const row = rows[0];
    if (!row) return null;
    return row.payload as DomainScanDiffResult;
}

export interface ProjectScanDiffEntry {
    domain: string;
    scanId: string;
    diff: DomainScanDiffResult | null;
}

/**
 * Load stored diffs for a set of scan IDs (competitor refs + own scan).
 */
export async function loadDomainScanDiffsForScanIds(
    userId: string,
    entries: Array<{ domain: string; scanId: string }>,
): Promise<ProjectScanDiffEntry[]> {
    if (entries.length === 0) return [];
    const scanIds = entries.map((e) => e.scanId);
    const db = getDb();
    const rows = await db
        .select({
            scanId: domainScanDiffs.currentDomainScanId,
            payload: domainScanDiffs.payload,
            rowUserId: domainScanDiffs.userId,
        })
        .from(domainScanDiffs)
        .where(
            and(
                inArray(domainScanDiffs.currentDomainScanId, scanIds),
                eq(domainScanDiffs.userId, userId),
            ),
        );

    const byScanId = new Map<string, DomainScanDiffResult>();
    for (const row of rows) {
        byScanId.set(row.scanId, row.payload as DomainScanDiffResult);
    }

    return entries.map((e) => ({
        domain: e.domain,
        scanId: e.scanId,
        diff: byScanId.get(e.scanId) ?? null,
    }));
}
