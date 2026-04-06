/**
 * Single-read payload for domain result shell: light aggregates + totals (no large arrays).
 */
import { countDomainPagesInDb, countPayloadPages } from '@/lib/db/domain-slim-pages';
import { getDomainScanWithProjectId } from '@/lib/db/scans';
import { buildDomainSummary, toLightDomainSummaryApiPayload, type DomainSummaryApiResponse } from '@/lib/domain-summary';
import type { DomainScanResult } from '@/lib/types';

export type DomainBundleApiResponse = DomainSummaryApiResponse & {
    projectId: string | null;
    /** Total rows for slim table / pagination (DB or payload). */
    totalSlimRows: number;
};

export async function buildDomainBundleForUser(domainScanId: string, userId: string): Promise<DomainBundleApiResponse | null> {
    const row = await getDomainScanWithProjectId(domainScanId, userId);
    if (!row) return null;
    const summary = buildDomainSummary(row.result as DomainScanResult);
    const light = toLightDomainSummaryApiPayload(summary);
    let totalSlimRows = await countDomainPagesInDb(domainScanId, userId);
    if (totalSlimRows === 0) {
        totalSlimRows = countPayloadPages(row.result as DomainScanResult);
    }
    return {
        ...light,
        projectId: row.projectId,
        totalSlimRows,
    };
}
