/**
 * After a deep scan (or page-classification refresh), infer `projects.industry` from aggregated themes when still empty.
 */
import { invalidateDomainList } from '@/lib/cache';
import { getDomainScan, getDomainScanProjectId } from '@/lib/db/scans';
import { getProject, updateProject } from '@/lib/db/projects';
import { PAGE_TOPIC_ROLLUP_REFINE_CLAUDE_MODEL } from '@/lib/llm/config';
import {
    buildThemesForIndustryInfer,
    inferProjectIndustryWithLlm,
    isAutoProjectIndustryInferDisabled,
} from '@/lib/llm/project-industry-infer';
import { reportUsage } from '@/lib/usage-report';
import type { AggregatedPageClassification } from '@/lib/types';

function shouldOverwriteExistingIndustry(): boolean {
    const v = process.env.CHECKION_AUTO_INDUSTRY_OVERWRITE?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}

/**
 * Fire-and-forget safe: loads latest payload + project; skips if disabled, no project, or industry already set (unless overwrite env).
 */
export async function maybeAutoFillProjectIndustryFromDomainScan(args: {
    userId: string;
    domainScanId: string;
}): Promise<void> {
    const { userId, domainScanId } = args;
    try {
        if (isAutoProjectIndustryInferDisabled()) return;

        const projectId = await getDomainScanProjectId(domainScanId, userId);
        if (!projectId) return;

        const project = await getProject(projectId, userId);
        if (!project) return;

        if (project.industry?.trim() && !shouldOverwriteExistingIndustry()) return;

        const row = await getDomainScan(domainScanId, userId);
        const pc = row?.aggregated?.pageClassification as AggregatedPageClassification | undefined;
        const themes = buildThemesForIndustryInfer(pc, 18);
        if (themes.length < 2) return;

        const domainOrigin = row?.domain?.trim() || 'unknown';
        const { industry, usage } = await inferProjectIndustryWithLlm({
            domainOrigin,
            projectName: project.name,
            themes,
        });

        if (!industry?.trim()) return;

        const ok = await updateProject(projectId, userId, { industry });
        if (!ok) return;

        invalidateDomainList(userId);

        if (usage && (usage.input_tokens > 0 || usage.output_tokens > 0)) {
            try {
                reportUsage({
                    userId,
                    eventType: 'project_industry_infer',
                    rawUnits: {
                        input_tokens: usage.input_tokens,
                        output_tokens: usage.output_tokens,
                        domain_scan_id: domainScanId,
                        project_id: projectId,
                        model: PAGE_TOPIC_ROLLUP_REFINE_CLAUDE_MODEL,
                    },
                    idempotencyKey: `project_industry_infer:${domainScanId}`,
                });
            } catch {
                /* ignore */
            }
        }
    } catch (e) {
        console.warn('[CHECKION] maybeAutoFillProjectIndustryFromDomainScan:', e instanceof Error ? e.message : e);
    }
}
