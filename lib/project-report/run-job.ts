/**
 * Background job runner for project report generation.
 */

import { buildProjectReportBundle } from '@/lib/project-report/build-bundle';
import { updateProjectReportRun } from '@/lib/db/project-report-runs';
import type { ProjectReportLocale, ProjectReportVariant } from '@/lib/project-report/types';

const JOB_TIMEOUT_MS = 120_000;

export interface RunProjectReportJobParams {
    runId: string;
    projectId: string;
    viewerUserId: string;
    ownerUserId: string;
    locale: ProjectReportLocale;
    variant: ProjectReportVariant;
    skipLlm?: boolean;
}

export function runProjectReportJob(params: RunProjectReportJobParams): void {
    (async () => {
        const timeout = setTimeout(() => {
            void updateProjectReportRun(params.runId, params.ownerUserId, {
                status: 'error',
                error: 'Report generation timed out after 120s',
                completedAt: new Date(),
            });
        }, JOB_TIMEOUT_MS);

        try {
            await updateProjectReportRun(params.runId, params.ownerUserId, { status: 'running' });

            const bundle = await buildProjectReportBundle(params.projectId, params.viewerUserId, {
                locale: params.locale,
                variant: params.variant,
                userId: params.ownerUserId,
                projectId: params.projectId,
                runId: params.runId,
                skipLlm: params.skipLlm,
            });

            await updateProjectReportRun(params.runId, params.ownerUserId, {
                status: 'complete',
                bundle,
                error: null,
                completedAt: new Date(),
            });
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Report generation failed';
            console.error('[CHECKION] project report job error:', e);
            await updateProjectReportRun(params.runId, params.ownerUserId, {
                status: 'error',
                error: message,
                completedAt: new Date(),
            });
        } finally {
            clearTimeout(timeout);
        }
    })();
}
