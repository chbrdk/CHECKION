/**
 * Background job runner for project report generation.
 */

import { buildProjectReportBundle } from '@/lib/project-report/build-bundle';
import { updateProjectReportRun } from '@/lib/db/project-report-runs';
import { makeReportProgress, STAGE_LABELS } from '@/lib/project-report/progress';
import type { ProjectReportLocale, ProjectReportVariant } from '@/lib/project-report/types';

const EXECUTIVE_TIMEOUT_MS = 120_000;
const COMPREHENSIVE_TIMEOUT_MS = 900_000;

function jobTimeoutMs(variant: ProjectReportVariant): number {
    return variant === 'comprehensive' ? COMPREHENSIVE_TIMEOUT_MS : EXECUTIVE_TIMEOUT_MS;
}

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
        const timeoutMs = jobTimeoutMs(params.variant);
        const timeout = setTimeout(() => {
            void updateProjectReportRun(params.runId, params.ownerUserId, {
                status: 'error',
                error: `Report generation timed out after ${Math.round(timeoutMs / 1000)}s`,
                completedAt: new Date(),
                progress: makeReportProgress(
                    'error',
                    STAGE_LABELS.error.de,
                    STAGE_LABELS.error.en,
                    params.locale
                ),
            });
        }, timeoutMs);

        try {
            await updateProjectReportRun(params.runId, params.ownerUserId, {
                status: 'running',
                progress: makeReportProgress(
                    'collecting',
                    STAGE_LABELS.collecting.de,
                    STAGE_LABELS.collecting.en,
                    params.locale
                ),
            });

            const bundle = await buildProjectReportBundle(params.projectId, params.viewerUserId, {
                locale: params.locale,
                variant: params.variant,
                userId: params.ownerUserId,
                projectId: params.projectId,
                runId: params.runId,
                skipLlm: params.skipLlm,
                onProgress: async (progress) => {
                    await updateProjectReportRun(params.runId, params.ownerUserId, { progress });
                },
            });

            await updateProjectReportRun(params.runId, params.ownerUserId, {
                status: 'complete',
                bundle,
                error: null,
                completedAt: new Date(),
                progress: makeReportProgress(
                    'complete',
                    STAGE_LABELS.complete.de,
                    STAGE_LABELS.complete.en,
                    params.locale
                ),
            });
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Report generation failed';
            console.error('[CHECKION] project report job error:', e);
            await updateProjectReportRun(params.runId, params.ownerUserId, {
                status: 'error',
                error: message,
                completedAt: new Date(),
                progress: makeReportProgress(
                    'error',
                    STAGE_LABELS.error.de,
                    STAGE_LABELS.error.en,
                    params.locale
                ),
            });
        } finally {
            clearTimeout(timeout);
        }
    })();
}
