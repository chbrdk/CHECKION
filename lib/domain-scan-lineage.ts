import { normalizeDomain } from '@/lib/domain-normalize';

/**
 * Groups deep-scan runs per user, project scope, and normalized hostname so re-scans version under one lineage.
 */
export function buildDomainScanLineageKey(
    userId: string,
    projectId: string | null | undefined,
    domain: string
): string {
    const host = normalizeDomain(domain);
    const proj = projectId ?? '';
    return `${userId}|${proj}|${host}`;
}
