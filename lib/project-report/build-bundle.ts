/**
 * Assembles the full project report bundle (facts + charts + narrative).
 */

import { collectProjectReportFacts } from '@/lib/project-report/collector';
import { collectDeepProjectReportData } from '@/lib/project-report/collector-deep';
import { collectAudienceReportData } from '@/lib/project-report/collector-audience';
import { runEchonMarketResearchForReport } from '@/lib/project-report/collector-echon';
import { getProject } from '@/lib/db/projects';
import { enrichAudienceOverlayWithPersonaAgents } from '@/lib/project-report/persona-audience-agent';
import type { AudionPersonaFact } from '@/lib/integrations/audion-audience-client';
import { buildChartSpecs } from '@/lib/project-report/chart-specs';
import { synthesizeProjectReportNarrative } from '@/lib/project-report/agent-pipeline';
import { synthesizeComprehensiveReport } from '@/lib/project-report/multi-agent-pipeline';
import { makeReportProgress, STAGE_LABELS } from '@/lib/project-report/progress';
import type { CollectProjectReportOptions, ProjectReportBundle } from '@/lib/project-report/types';
import type { ReportProgress } from '@/lib/project-report/progress';

export interface BuildProjectReportBundleOptionsExtended extends CollectProjectReportOptions {
    userId: string;
    projectId: string;
    runId: string;
    skipLlm?: boolean;
    onProgress?: (progress: ReportProgress) => Promise<void>;
}

function isDeepVariant(variant: string): boolean {
    return variant === 'full' || variant === 'comprehensive';
}

export async function buildProjectReportBundle(
    projectId: string,
    viewerUserId: string,
    options: BuildProjectReportBundleOptionsExtended
): Promise<ProjectReportBundle> {
    const reportProgress = async (stage: keyof typeof STAGE_LABELS) => {
        if (options.onProgress) {
            const labels = STAGE_LABELS[stage];
            await options.onProgress(
                makeReportProgress(stage, labels.de, labels.en, options.locale)
            );
        }
    };

    await reportProgress('collecting');
    const facts = await collectProjectReportFacts(projectId, viewerUserId, {
        locale: options.locale,
        variant: options.variant,
    });

    let deep = null;
    let audience = null;
    let audienceSourcePersonas: AudionPersonaFact[] = [];
    if (isDeepVariant(options.variant)) {
        await reportProgress('collecting_deep');
        deep = await collectDeepProjectReportData(facts, viewerUserId, projectId);
        // enrich rank trends for comprehensive
        if (options.variant === 'comprehensive' && deep.rankKeywordDetails.length > 0) {
            facts.rankTrends = deep.rankKeywordDetails.slice(0, 10).map((k) => ({
                keywordId: k.id,
                keyword: k.keyword,
                points: k.points,
            }));
        }
    }

    let narrative;
    let marketContext = facts.marketContext;
    if (options.variant === 'comprehensive' && deep) {
        const projectRow = await getProject(projectId, viewerUserId);

        const audienceData = await collectAudienceReportData(
            projectId,
            { ...facts, deep },
            options.locale
        );
        audience = audienceData.overlay;
        audienceSourcePersonas = audienceData.sourcePersonas;
        if (audience.available) {
            facts.provenance.push({
                evidenceId: 'ev-audience-overlay',
                source: 'audion',
                label: 'AUDION audience overlay',
                value: audience.audionProjectName,
            });
        }

        await reportProgress('agent_echon_research');
        marketContext = await runEchonMarketResearchForReport({
            locale: options.locale,
            skipLlm: options.skipLlm,
            facts: { ...facts, deep },
            audience,
            sourcePersonas: audienceSourcePersonas,
            pinnedThreadId: projectRow?.echonResearchThreadId,
        });
        facts.marketContext = marketContext;
        if (marketContext.available) {
            facts.provenance.push({
                evidenceId: 'ev-echon-market',
                source: 'echon',
                label: 'ECHON market research',
                value: marketContext.threadTitle ?? marketContext.threadId,
            });
        } else if (marketContext.reason && marketContext.reason !== 'echon_skipped') {
            console.warn(
                `[CHECKION] ECHON market research skipped for project ${projectId}: ${marketContext.reason}`
            );
        }

        const result = await synthesizeComprehensiveReport(facts, deep, {
            userId: options.userId,
            projectId: options.projectId,
            runId: options.runId,
            skipLlm: options.skipLlm,
            onProgress: options.onProgress,
            locale: options.locale,
        });
        narrative = result.narrative;
        deep = result.deep;

        if (audience.available && audienceSourcePersonas.length > 0) {
            audience = await enrichAudienceOverlayWithPersonaAgents(
                audience,
                facts,
                deep,
                deep.sections,
                {
                    locale: options.locale,
                    skipLlm: options.skipLlm,
                    userId: options.userId,
                    projectId: options.projectId,
                    runId: options.runId,
                    onProgress: options.onProgress,
                    audionPersonas: audienceSourcePersonas,
                }
            );
        }
    } else {
        narrative = await synthesizeProjectReportNarrative(facts, {
            userId: options.userId,
            projectId: options.projectId,
            runId: options.runId,
            skipLlm: options.skipLlm,
        });
    }

    await reportProgress('building_charts');
    const visuals = buildChartSpecs(
        facts.domain,
        facts.competitors,
        facts.rankings,
        facts.geo,
        facts.project.domain,
        facts.rankTrends,
        deep
    );

    const version = isDeepVariant(options.variant) ? '2.0' : '1.0';

    return {
        ...facts,
        version,
        visuals,
        narrative,
        deep,
        audience,
        marketContext,
    };
}

// Re-export for backwards compatibility
export type { BuildProjectReportBundleOptionsExtended as BuildProjectReportBundleOptions };
