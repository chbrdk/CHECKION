/**
 * Orchestrates domain scan diff computation and persistence after scan complete.
 */

import { listDomainScanDiffPageInputs } from '@/lib/db/domain-scan-diff-pages';
import { upsertDomainScanDiff } from '@/lib/db/domain-scan-diffs';
import { createAlertsForDomainScanDiff } from '@/lib/db/competitor-change-alerts';
import {
    getDomainScanLineageMeta,
    getPreviousDomainScanId,
} from '@/lib/db/domain-scan-lineage-queries';
import { buildDomainScanDiff } from '@/lib/domain-scan-diff';
import type { DomainScanDiffResult } from '@/lib/domain-scan-diff';
import { buildDomainScanThemeDiff } from '@/lib/domain-scan-diff-themes';

export interface ComputeDomainScanDiffOptions {
    userId: string;
    domainScanId: string;
    /** When true, include theme slice (after classification). */
    includeThemes?: boolean;
}

export async function computeDomainScanDiff(
    options: ComputeDomainScanDiffOptions,
): Promise<DomainScanDiffResult | null> {
    const { userId, domainScanId, includeThemes = false } = options;

    const meta = await getDomainScanLineageMeta(domainScanId, userId);
    if (!meta || meta.status !== 'complete') return null;

    const previousScanId = await getPreviousDomainScanId(userId, domainScanId);
    const currentPages = await listDomainScanDiffPageInputs(domainScanId, userId);
    const previousPages = previousScanId
        ? await listDomainScanDiffPageInputs(previousScanId, userId)
        : [];

    let themes: DomainScanDiffResult['themes'];
    if (includeThemes && previousScanId) {
        themes = await buildDomainScanThemeDiff({
            userId,
            currentScanId: domainScanId,
            previousScanId,
            currentPages,
            previousPages,
        });
    }

    return buildDomainScanDiff({
        currentScanId: domainScanId,
        previousScanId,
        lineageKey: meta.lineageKey,
        currentVersion: meta.lineageVersion,
        currentPages,
        previousPages,
        themes,
    });
}

export async function computeAndPersistDomainScanDiff(
    options: ComputeDomainScanDiffOptions,
): Promise<DomainScanDiffResult | null> {
    const diff = await computeDomainScanDiff(options);
    if (!diff) return null;
    await upsertDomainScanDiff(options.userId, diff);
    await createAlertsForDomainScanDiff(options.userId, options.domainScanId, diff).catch((e) =>
        console.error('[CHECKION] competitor change alert failed', options.domainScanId, e),
    );
    return diff;
}

/**
 * Recompute theme slice on an existing diff (e.g. after page classification job).
 */
export async function recomputeThemeSliceAndUpsertDiff(
    userId: string,
    domainScanId: string,
): Promise<DomainScanDiffResult | null> {
    return computeAndPersistDomainScanDiff({
        userId,
        domainScanId,
        includeThemes: true,
    });
}
