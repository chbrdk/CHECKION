/**
 * Project-level competitor / own-domain scan change summaries.
 */

import { getProjectDomainScanReferences } from '@/lib/db/project-domain-references';
import { loadDomainScanDiffsForScanIds } from '@/lib/db/domain-scan-diffs';
import { listDomainScanSummaries } from '@/lib/db/scans';
import { computeAndPersistDomainScanDiff } from '@/lib/domain-scan-diff-job';
import type { DomainScanDiffResult } from '@/lib/domain-scan-diff';
import { getDomainScanDiffForUser } from '@/lib/db/domain-scan-diffs';

export interface ProjectCompetitorChangesData {
    own: DomainScanDiffResult | null;
    competitors: Record<string, DomainScanDiffResult | null>;
}

async function ensureDiff(
    userId: string,
    scanId: string,
    lazyCompute: boolean,
): Promise<DomainScanDiffResult | null> {
    const stored = await getDomainScanDiffForUser(scanId, userId);
    if (stored) {
        if (!stored.themes?.length && lazyCompute) {
            return computeAndPersistDomainScanDiff({
                userId,
                domainScanId: scanId,
                includeThemes: true,
            });
        }
        return stored;
    }
    if (!lazyCompute) return null;
    return computeAndPersistDomainScanDiff({ userId, domainScanId: scanId, includeThemes: true });
}

export async function buildProjectCompetitorChanges(
    projectUserId: string,
    projectId: string,
    options?: { lazyCompute?: boolean },
): Promise<ProjectCompetitorChangesData> {
    const lazyCompute = options?.lazyCompute !== false;

    let ownScanId: string | null = null;
    let ownDomain = '';
    const summaries = await listDomainScanSummaries(projectUserId, { projectId, limit: 1 });
    if (summaries.length > 0) {
        ownScanId = summaries[0]!.id;
        ownDomain = summaries[0]!.domain ?? 'own';
    }

    const refs = await getProjectDomainScanReferences(projectId);
    const entries: Array<{ domain: string; scanId: string }> = [];
    if (ownScanId) {
        entries.push({ domain: ownDomain, scanId: ownScanId });
    }
    for (const ref of refs) {
        entries.push({ domain: ref.domain, scanId: ref.domainScanId });
    }

    const loaded = await loadDomainScanDiffsForScanIds(projectUserId, entries);

    const competitors: Record<string, DomainScanDiffResult | null> = {};
    let own: DomainScanDiffResult | null = null;

    for (const entry of loaded) {
        let diff = entry.diff;
        if (!diff && lazyCompute) {
            diff = await ensureDiff(projectUserId, entry.scanId, true);
        } else if (diff && !diff.themes?.length && lazyCompute) {
            diff = await ensureDiff(projectUserId, entry.scanId, true);
        }

        if (ownScanId && entry.scanId === ownScanId) {
            own = diff;
        } else {
            competitors[entry.domain] = diff;
        }
    }

    return { own, competitors };
}
