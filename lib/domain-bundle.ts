/**
 * Single-read payload for domain result shell: light aggregates + totals (no large arrays).
 */
import { getDomainScanAccess } from '@/lib/domain-scan-access';
import { countDomainPagesInDb, countPayloadPages } from '@/lib/db/domain-slim-pages';
import { getDomainScanWithProjectId } from '@/lib/db/scans';
import { buildDomainSummary, toLightDomainSummaryApiPayload, type DomainSummaryApiResponse } from '@/lib/domain-summary';
import type { DomainScanResult } from '@/lib/types';

export type DomainBundleApiResponse = DomainSummaryApiResponse & {
    projectId: string | null;
    /** Total rows for slim table / pagination (DB or payload). */
    totalSlimRows: number;
};

export async function buildDomainBundleForOwner(domainScanId: string, ownerUserId: string): Promise<DomainBundleApiResponse | null> {
    const row = await getDomainScanWithProjectId(domainScanId, ownerUserId);
    if (!row) return null;
    const summary = buildDomainSummary(row.result as DomainScanResult);
    const light = toLightDomainSummaryApiPayload(summary);
    let totalSlimRows = await countDomainPagesInDb(domainScanId, ownerUserId);
    if (totalSlimRows === 0) {
        totalSlimRows = countPayloadPages(row.result as DomainScanResult);
    }
    return {
        ...light,
        projectId: row.projectId,
        totalSlimRows,
    };
}

export async function buildDomainBundleForRequest(request: Request, domainScanId: string): Promise<DomainBundleApiResponse | null> {
    const access = await getDomainScanAccess(request, domainScanId);
    if (!access.ok) return null;
    return buildDomainBundleForOwner(domainScanId, access.ownerUserId);
}
