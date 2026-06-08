/**
 * Assembles the full project report bundle (facts + charts + narrative).
 */

import { collectProjectReportFacts } from '@/lib/project-report/collector';
import { buildChartSpecs } from '@/lib/project-report/chart-specs';
import { synthesizeProjectReportNarrative } from '@/lib/project-report/agent-pipeline';
import type {
    CollectProjectReportOptions,
    ProjectReportBundle,
} from '@/lib/project-report/types';

export interface BuildProjectReportBundleOptions extends CollectProjectReportOptions {
    userId: string;
    projectId: string;
    runId: string;
    skipLlm?: boolean;
}

export async function buildProjectReportBundle(
    projectId: string,
    viewerUserId: string,
    options: BuildProjectReportBundleOptions
): Promise<ProjectReportBundle> {
    const facts = await collectProjectReportFacts(projectId, viewerUserId, {
        locale: options.locale,
        variant: options.variant,
    });

    const narrative = await synthesizeProjectReportNarrative(facts, {
        userId: options.userId,
        projectId: options.projectId,
        runId: options.runId,
        skipLlm: options.skipLlm,
    });

    const visuals = buildChartSpecs(
        facts.domain,
        facts.competitors,
        facts.rankings,
        facts.geo,
        facts.project.domain,
        facts.rankTrends
    );

    return {
        ...facts,
        visuals,
        narrative,
    };
}
