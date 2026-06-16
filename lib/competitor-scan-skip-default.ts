import { getLatestCompletedDomainScanByDomain } from '@/lib/db/project-domain-references';
import { listDomainScanSummaries } from '@/lib/db/scans';

/**
 * Resolves skipUnchangedPages: explicit query wins; otherwise default true when a prior complete scan exists.
 */
export function resolveSkipUnchangedPagesFromQuery(
    searchParams: URLSearchParams,
    hasPriorCompleteScan: boolean,
): boolean {
    const explicit = searchParams.get('skipUnchangedPages');
    if (explicit === 'true') return true;
    if (explicit === 'false') return false;
    return hasPriorCompleteScan;
}

export async function hasPriorCompetitorCompleteScan(
    userId: string,
    normalizedDomain: string,
): Promise<boolean> {
    const latest = await getLatestCompletedDomainScanByDomain(userId, normalizedDomain);
    return latest != null;
}

export async function hasPriorOwnDomainCompleteScan(
    userId: string,
    projectId: string,
): Promise<boolean> {
    const summaries = await listDomainScanSummaries(userId, { projectId, limit: 2 });
    return summaries.filter((s) => s.status === 'complete').length > 0;
}
