/**
 * After a deep scan (or page-classification refresh):
 * - `domain_scans.tags` + `domain_scans.industry` from aggregated themes (project-independent).
 * - When a project is linked: also infer `projects.tags` / `projects.industry` and sync tags onto scans.
 */
import {
    ENV_CHECKION_AUTO_TAGS_OVERWRITE,
    ENV_CHECKION_DISABLE_AUTO_PROJECT_TAGS,
} from '@/lib/constants';
import { invalidateDomainList, invalidateDomainScan, invalidateScansList } from '@/lib/cache';
import { syncDomainScanTagsForProjectId } from '@/lib/db/sync-domain-scan-tags-from-projects';
import { syncStandaloneScansTagsForProjectId } from '@/lib/db/sync-standalone-scan-tags-from-projects';
import {
    getDomainScan,
    getDomainScanClassificationColumns,
    getDomainScanProjectId,
    updateDomainScanIndustry,
    updateDomainScanTags,
} from '@/lib/db/scans';
import { getProject, updateProject } from '@/lib/db/projects';
import { extractHostname } from '@/lib/geo-eeat/suggest-parse';
import { PAGE_TOPIC_ROLLUP_REFINE_CLAUDE_MODEL } from '@/lib/llm/config';
import {
    buildThemesForIndustryInfer,
    buildThemesForIndustryInferFromPageClassification,
    inferProjectIndustryWithLlm,
    isAutoProjectIndustryInferDisabled,
} from '@/lib/llm/project-industry-infer';
import { reportUsage } from '@/lib/usage-report';
import { rollupTagTiersToProjectTags, rollupThemesToProjectTags } from '@/lib/tag-utils';
import type { AggregatedPageClassification, ScanResult } from '@/lib/types';

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
        await syncStandaloneScansTagsForProjectId(projectId);
        invalidateDomainList(userId);
        invalidateScansList(userId);
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

/** After POST /api/scan with `projectId`: fill `projects.tags` from desktop `pageClassification.tagTiers` when empty. */
export async function maybeAutoFillProjectTagsFromStandaloneScan(args: {
    userId: string;
    projectId: string;
    desktopResult: ScanResult;
}): Promise<void> {
    const { userId, projectId, desktopResult } = args;
    try {
        if (isAutoProjectTagsDisabled()) return;

        const project = await getProject(projectId, userId);
        if (!project) return;

        if (project.tags.length > 0 && !shouldOverwriteExistingTags()) return;

        const nextTags = rollupTagTiersToProjectTags(desktopResult.pageClassification, 12);
        if (nextTags.length === 0) return;

        const ok = await updateProject(projectId, userId, { tags: nextTags });
        if (!ok) return;

        await syncDomainScanTagsForProjectId(projectId);
        await syncStandaloneScansTagsForProjectId(projectId);
        invalidateDomainList(userId);
        invalidateScansList(userId);
    } catch (e) {
        console.warn(
            '[CHECKION] maybeAutoFillProjectTagsFromStandaloneScan:',
            e instanceof Error ? e.message : e
        );
    }
}

/**
 * Same industry pool + Haiku call as deep-scan path, using one page’s themes (or domain-only if classification missing).
 */
export async function maybeAutoFillProjectIndustryFromStandaloneScan(args: {
    userId: string;
    projectId: string;
    scanUrl: string;
    scanSessionId: string;
    desktopResult: ScanResult;
}): Promise<void> {
    const { userId, projectId, scanUrl, scanSessionId, desktopResult } = args;
    try {
        if (isAutoProjectIndustryInferDisabled()) return;

        const project = await getProject(projectId, userId);
        if (!project) return;

        if (project.industry?.trim() && !shouldOverwriteExistingIndustry()) return;

        const themes = buildThemesForIndustryInferFromPageClassification(desktopResult.pageClassification, 18);
        const domainOrigin = extractHostname(scanUrl).trim() || 'unknown';
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
                        scan_session_id: scanSessionId,
                        project_id: projectId,
                        model: PAGE_TOPIC_ROLLUP_REFINE_CLAUDE_MODEL,
                    },
                    idempotencyKey: `project_industry_infer:standalone:${scanSessionId}`,
                });
            } catch {
                /* ignore */
            }
        }
    } catch (e) {
        console.warn(
            '[CHECKION] maybeAutoFillProjectIndustryFromStandaloneScan:',
            e instanceof Error ? e.message : e
        );
    }
}

export async function maybeAutoFillProjectClassificationFromStandaloneScan(args: {
    userId: string;
    projectId: string;
    scanUrl: string;
    scanSessionId: string;
    desktopResult: ScanResult;
}): Promise<void> {
    await maybeAutoFillProjectTagsFromStandaloneScan({
        userId: args.userId,
        projectId: args.projectId,
        desktopResult: args.desktopResult,
    });
    await maybeAutoFillProjectIndustryFromStandaloneScan({
        userId: args.userId,
        projectId: args.projectId,
        scanUrl: args.scanUrl,
        scanSessionId: args.scanSessionId,
        desktopResult: args.desktopResult,
    });
}

/** Persist rollup themes onto `domain_scans.tags` (no project required). */
export async function maybeAutoFillDomainScanTagsFromAggregated(args: {
    userId: string;
    domainScanId: string;
}): Promise<void> {
    const { userId, domainScanId } = args;
    try {
        if (isAutoProjectTagsDisabled()) return;

        const meta = await getDomainScanClassificationColumns(domainScanId, userId);
        if (!meta) return;
        if (meta.tags.length > 0 && !shouldOverwriteExistingTags()) return;

        const row = await getDomainScan(domainScanId, userId);
        const pc = row?.aggregated?.pageClassification as AggregatedPageClassification | undefined;
        const nextTags = rollupThemesToProjectTags(pc, 12);
        if (nextTags.length === 0) return;

        const ok = await updateDomainScanTags(domainScanId, userId, nextTags);
        if (!ok) return;

        invalidateDomainScan(domainScanId);
        invalidateDomainList(userId);
    } catch (e) {
        console.warn(
            '[CHECKION] maybeAutoFillDomainScanTagsFromAggregated:',
            e instanceof Error ? e.message : e
        );
    }
}

/** Infer industry pool id onto `domain_scans.industry` (no project required). */
export async function maybeAutoFillDomainScanIndustryFromAggregated(args: {
    userId: string;
    domainScanId: string;
}): Promise<void> {
    const { userId, domainScanId } = args;
    try {
        if (isAutoProjectIndustryInferDisabled()) return;

        const meta = await getDomainScanClassificationColumns(domainScanId, userId);
        if (!meta) return;
        if (meta.industry?.trim() && !shouldOverwriteExistingIndustry()) return;

        const row = await getDomainScan(domainScanId, userId);
        const pc = row?.aggregated?.pageClassification as AggregatedPageClassification | undefined;
        const themes = buildThemesForIndustryInfer(pc, 18);
        const domainOrigin = meta.domain.trim() || row?.domain?.trim() || 'unknown';

        const { industry, usage } = await inferProjectIndustryWithLlm({
            domainOrigin,
            projectName: null,
            themes,
        });

        if (!industry?.trim()) return;

        const ok = await updateDomainScanIndustry(domainScanId, userId, industry);
        if (!ok) return;

        invalidateDomainScan(domainScanId);
        invalidateDomainList(userId);

        if (usage && (usage.input_tokens > 0 || usage.output_tokens > 0)) {
            try {
                reportUsage({
                    userId,
                    eventType: 'domain_scan_industry_infer',
                    rawUnits: {
                        input_tokens: usage.input_tokens,
                        output_tokens: usage.output_tokens,
                        domain_scan_id: domainScanId,
                        model: PAGE_TOPIC_ROLLUP_REFINE_CLAUDE_MODEL,
                    },
                    idempotencyKey: `domain_scan_industry_infer:${domainScanId}`,
                });
            } catch {
                /* ignore */
            }
        }
    } catch (e) {
        console.warn(
            '[CHECKION] maybeAutoFillDomainScanIndustryFromAggregated:',
            e instanceof Error ? e.message : e
        );
    }
}

/** Scan-row classification after payload aggregate exists (runs with or without `project_id`). */
export async function maybeAutoFillDomainScanClassificationFromAggregated(args: {
    userId: string;
    domainScanId: string;
}): Promise<void> {
    await maybeAutoFillDomainScanTagsFromAggregated(args);
    await maybeAutoFillDomainScanIndustryFromAggregated(args);
}
