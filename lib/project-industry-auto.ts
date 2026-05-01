/**
 * After a deep scan (or page-classification refresh), infer `projects.tags` from rollup themes and
 * `projects.industry` from themes and/or domain name when still empty (unless disabled / overwrite env).
 */
import {
    ENV_CHECKION_AUTO_TAGS_OVERWRITE,
    ENV_CHECKION_DISABLE_AUTO_PROJECT_TAGS,
} from '@/lib/constants';
import { invalidateDomainList } from '@/lib/cache';
import { syncDomainScanTagsForProjectId } from '@/lib/db/sync-domain-scan-tags-from-projects';
import { getDomainScan, getDomainScanProjectId } from '@/lib/db/scans';
import { getProject, updateProject } from '@/lib/db/projects';
import { PAGE_TOPIC_ROLLUP_REFINE_CLAUDE_MODEL } from '@/lib/llm/config';
import {
    buildThemesForIndustryInfer,
    inferProjectIndustryWithLlm,
    isAutoProjectIndustryInferDisabled,
} from '@/lib/llm/project-industry-infer';
import { reportUsage } from '@/lib/usage-report';
import { rollupThemesToProjectTags } from '@/lib/tag-utils';
import type { AggregatedPageClassification } from '@/lib/types';

function shouldOverwriteExistingIndustry(): boolean {
    const v = process.env.CHECKION_AUTO_INDUSTRY_OVERWRITE?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}

function isAutoProjectTagsDisabled(): boolean {
    const v = process.env[ENV_CHECKION_DISABLE_AUTO_PROJECT_TAGS]?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}

function shouldOverwriteExistingTags(): boolean {
    const v = process.env[ENV_CHECKION_AUTO_TAGS_OVERWRITE]?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}

/** Tags from `aggregated.pageClassification.topThemes`, then sync scans; runs before industry infer. */
export async function maybeAutoFillProjectTagsFromDomainScan(args: {
    userId: string;
    domainScanId: string;
}): Promise<void> {
    const { userId, domainScanId } = args;
    try {
        if (isAutoProjectTagsDisabled()) return;

        const projectId = await getDomainScanProjectId(domainScanId, userId);
        if (!projectId) return;

        const project = await getProject(projectId, userId);
        if (!project) return;

        if (project.tags.length > 0 && !shouldOverwriteExistingTags()) return;

        const row = await getDomainScan(domainScanId, userId);
        const pc = row?.aggregated?.pageClassification as AggregatedPageClassification | undefined;
        const nextTags = rollupThemesToProjectTags(pc, 12);
        if (nextTags.length === 0) return;

        const ok = await updateProject(projectId, userId, { tags: nextTags });
        if (!ok) return;

        await syncDomainScanTagsForProjectId(projectId);
        invalidateDomainList(userId);
    } catch (e) {
        console.warn('[CHECKION] maybeAutoFillProjectTagsFromDomainScan:', e instanceof Error ? e.message : e);
    }
}

/**
 * Fire-and-forget: tags from rollup, then industry from themes/domain.
 */
export async function maybeAutoFillProjectClassificationFromDomainScan(args: {
    userId: string;
    domainScanId: string;
}): Promise<void> {
    await maybeAutoFillProjectTagsFromDomainScan(args);
    await maybeAutoFillProjectIndustryFromDomainScan(args);
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
