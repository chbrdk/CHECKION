/**
 * Scheduled competitor re-scans for projects with stale competitor deep scans.
 */

import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { domainScans, projectDomainScanReferences, projects } from '@/lib/db/schema';
import { startProjectCompetitorDomainScan } from '@/lib/project-competitor-domain-scan';

const ACTIVE_STATUSES = ['queued', 'scanning', 'paused', 'cancelling'] as const;

export interface CompetitorRescanCronResult {
    projectsChecked: number;
    scansStarted: number;
    skippedActive: number;
    skippedRecent: number;
    errors: Array<{ projectId: string; domain: string; message: string }>;
}

export async function runCompetitorRescanCron(options?: {
    minAgeDays?: number;
    maxProjects?: number;
}): Promise<CompetitorRescanCronResult> {
    const minAgeDays = options?.minAgeDays ?? Number(process.env.CHECKION_COMPETITOR_RESCAN_MIN_AGE_DAYS ?? 7);
    const maxProjects = options?.maxProjects ?? Number(process.env.CHECKION_COMPETITOR_RESCAN_MAX_PROJECTS ?? 50);
    const cutoff = new Date(Date.now() - minAgeDays * 24 * 60 * 60 * 1000);

    const db = getDb();
    const projectRows = await db
        .select({ id: projects.id, userId: projects.userId })
        .from(projects)
        .limit(maxProjects);

    const result: CompetitorRescanCronResult = {
        projectsChecked: 0,
        scansStarted: 0,
        skippedActive: 0,
        skippedRecent: 0,
        errors: [],
    };

    for (const project of projectRows) {
        result.projectsChecked += 1;
        const refs = await db
            .select({
                domain: projectDomainScanReferences.domain,
                domainScanId: projectDomainScanReferences.domainScanId,
            })
            .from(projectDomainScanReferences)
            .where(eq(projectDomainScanReferences.projectId, project.id));

        for (const ref of refs) {
            try {
                const scanRows = await db
                    .select({
                        status: domainScans.status,
                        timestamp: domainScans.timestamp,
                    })
                    .from(domainScans)
                    .where(
                        and(
                            eq(domainScans.id, ref.domainScanId),
                            eq(domainScans.userId, project.userId),
                        ),
                    )
                    .limit(1);

                const scan = scanRows[0];
                if (!scan) continue;

                if (ACTIVE_STATUSES.includes(scan.status as (typeof ACTIVE_STATUSES)[number])) {
                    result.skippedActive += 1;
                    continue;
                }

                if (scan.status === 'complete' && new Date(scan.timestamp) >= cutoff) {
                    result.skippedRecent += 1;
                    continue;
                }

                await startProjectCompetitorDomainScan(project.userId, project.id, ref.domain, {
                    skipUnchangedPages: true,
                });
                result.scansStarted += 1;
            } catch (e) {
                result.errors.push({
                    projectId: project.id,
                    domain: ref.domain,
                    message: e instanceof Error ? e.message : String(e),
                });
            }
        }
    }

    return result;
}
