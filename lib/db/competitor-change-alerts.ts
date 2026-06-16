/**
 * Competitor change alerts (project notifications after scan diffs).
 */

import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { competitorChangeAlerts, domainScans, projectDomainScanReferences } from '@/lib/db/schema';
import type { DomainScanDiffResult } from '@/lib/domain-scan-diff';

export interface CompetitorChangeAlertRow {
    id: string;
    projectId: string;
    domain: string;
    domainScanId: string;
    summary: DomainScanDiffResult['summary'];
    createdAt: string;
    readAt: string | null;
}

function diffHasActivity(diff: DomainScanDiffResult): boolean {
    if (!diff.previousScanId) return false;
    return (
        diff.summary.newCount > 0 ||
        diff.summary.likelyUpdatedCount > 0 ||
        diff.summary.removedCount > 0 ||
        (diff.themes?.length ?? 0) > 0
    );
}

async function resolveProjectIdsForScan(domainScanId: string, userId: string): Promise<Array<{ projectId: string; domain: string }>> {
    const db = getDb();
    const out: Array<{ projectId: string; domain: string }> = [];

    const refs = await db
        .select({
            projectId: projectDomainScanReferences.projectId,
            domain: projectDomainScanReferences.domain,
        })
        .from(projectDomainScanReferences)
        .where(eq(projectDomainScanReferences.domainScanId, domainScanId));

    for (const r of refs) {
        out.push({ projectId: r.projectId, domain: r.domain });
    }

    const scanRows = await db
        .select({ projectId: domainScans.projectId, domain: domainScans.domain })
        .from(domainScans)
        .where(and(eq(domainScans.id, domainScanId), eq(domainScans.userId, userId)))
        .limit(1);

    const scan = scanRows[0];
    if (scan?.projectId) {
        out.push({ projectId: scan.projectId, domain: scan.domain });
    }

    const seen = new Set<string>();
    return out.filter((e) => {
        const key = `${e.projectId}|${e.domain}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export async function createAlertsForDomainScanDiff(
    userId: string,
    domainScanId: string,
    diff: DomainScanDiffResult,
): Promise<void> {
    if (!diffHasActivity(diff)) return;

    const targets = await resolveProjectIdsForScan(domainScanId, userId);
    if (targets.length === 0) return;

    const db = getDb();
    for (const target of targets) {
        await db.insert(competitorChangeAlerts).values({
            id: uuidv4(),
            projectId: target.projectId,
            userId,
            domain: target.domain,
            domainScanId,
            summary: diff.summary as unknown as Record<string, unknown>,
        });
    }
}

export async function listUnreadCompetitorChangeAlerts(
    projectId: string,
    userId: string,
    limit = 20,
): Promise<CompetitorChangeAlertRow[]> {
    const db = getDb();
    const rows = await db
        .select()
        .from(competitorChangeAlerts)
        .where(
            and(
                eq(competitorChangeAlerts.projectId, projectId),
                eq(competitorChangeAlerts.userId, userId),
                isNull(competitorChangeAlerts.readAt),
            ),
        )
        .orderBy(desc(competitorChangeAlerts.createdAt))
        .limit(limit);

    return rows.map((r) => ({
        id: r.id,
        projectId: r.projectId,
        domain: r.domain,
        domainScanId: r.domainScanId,
        summary: r.summary as DomainScanDiffResult['summary'],
        createdAt: r.createdAt.toISOString(),
        readAt: r.readAt?.toISOString() ?? null,
    }));
}

export async function markCompetitorChangeAlertsRead(
    projectId: string,
    userId: string,
    alertIds?: string[],
): Promise<number> {
    const db = getDb();
    const now = new Date();
    if (alertIds && alertIds.length > 0) {
        const result = await db
            .update(competitorChangeAlerts)
            .set({ readAt: now })
            .where(
                and(
                    eq(competitorChangeAlerts.projectId, projectId),
                    eq(competitorChangeAlerts.userId, userId),
                    inArray(competitorChangeAlerts.id, alertIds),
                ),
            );
        return result.rowCount ?? 0;
    }
    const result = await db
        .update(competitorChangeAlerts)
        .set({ readAt: now })
        .where(
            and(
                eq(competitorChangeAlerts.projectId, projectId),
                eq(competitorChangeAlerts.userId, userId),
                isNull(competitorChangeAlerts.readAt),
            ),
        );
    return result.rowCount ?? 0;
}
