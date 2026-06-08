/* ------------------------------------------------------------------ */
/*  CHECKION – Project report runs (DB)                               */
/* ------------------------------------------------------------------ */

import { eq, and, desc } from 'drizzle-orm';
import { getDb } from './index';
import { projectReportRuns } from './schema';
import type { ProjectReportBundle, ProjectReportRunStatus } from '@/lib/project-report/types';
import type { ReportProgress } from '@/lib/project-report/progress';

export interface ProjectReportRunRow {
    id: string;
    userId: string;
    projectId: string;
    status: ProjectReportRunStatus;
    locale: string;
    variant: string;
    bundle: ProjectReportBundle | null;
    progress: ReportProgress | null;
    error: string | null;
    createdAt: Date;
    completedAt: Date | null;
}

export async function insertProjectReportRun(
    id: string,
    userId: string,
    projectId: string,
    options: { locale: string; variant: string }
): Promise<void> {
    const db = getDb();
    await db.insert(projectReportRuns).values({
        id,
        userId,
        projectId,
        status: 'queued',
        locale: options.locale,
        variant: options.variant,
        bundle: null,
        error: null,
    });
}

export async function updateProjectReportRun(
    id: string,
    userId: string,
    data: {
        status?: ProjectReportRunStatus;
        bundle?: ProjectReportBundle | null;
        progress?: ReportProgress | null;
        error?: string | null;
        completedAt?: Date | null;
    }
): Promise<boolean> {
    const db = getDb();
    const updated = await db
        .update(projectReportRuns)
        .set({
            ...(data.status != null && { status: data.status }),
            ...(data.bundle !== undefined && { bundle: data.bundle }),
            ...(data.progress !== undefined && { progress: data.progress }),
            ...(data.error !== undefined && { error: data.error }),
            ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
        })
        .where(and(eq(projectReportRuns.id, id), eq(projectReportRuns.userId, userId)));
    return (updated.rowCount ?? 0) > 0;
}

export async function getProjectReportRun(
    id: string,
    userId: string
): Promise<ProjectReportRunRow | null> {
    const db = getDb();
    const rows = await db
        .select()
        .from(projectReportRuns)
        .where(and(eq(projectReportRuns.id, id), eq(projectReportRuns.userId, userId)))
        .limit(1);
    return rows.length > 0 ? (rows[0] as ProjectReportRunRow) : null;
}

export async function listProjectReportRuns(
    userId: string,
    projectId: string,
    limit: number = 10
): Promise<ProjectReportRunRow[]> {
    const db = getDb();
    const rows = await db
        .select()
        .from(projectReportRuns)
        .where(and(eq(projectReportRuns.userId, userId), eq(projectReportRuns.projectId, projectId)))
        .orderBy(desc(projectReportRuns.createdAt))
        .limit(limit);
    return rows as ProjectReportRunRow[];
}

export async function getLatestCompleteProjectReportRun(
    userId: string,
    projectId: string
): Promise<ProjectReportRunRow | null> {
    const db = getDb();
    const rows = await db
        .select()
        .from(projectReportRuns)
        .where(
            and(
                eq(projectReportRuns.userId, userId),
                eq(projectReportRuns.projectId, projectId),
                eq(projectReportRuns.status, 'complete')
            )
        )
        .orderBy(desc(projectReportRuns.completedAt))
        .limit(1);
    return rows.length > 0 ? (rows[0] as ProjectReportRunRow) : null;
}
