/**
 * Refresh domain scan payload from current scan results (e.g. after page classification).
 * Rebuilds SlimPage[] and aggregated from listScansByGroupId and updates domain_scans.payload.
 */

import { getDomainScan, listScansByGroupId, updateDomainScan } from '@/lib/db/scans';
import { countDomainPagesInDb } from '@/lib/db/domain-slim-pages';
import { buildStoredDomainPayload } from '@/lib/domain-summary';
import { invalidateDomainScan } from '@/lib/cache';

export async function refreshDomainPayloadFromScans(domainId: string, userId: string): Promise<boolean> {
    const current = await getDomainScan(domainId, userId);
    if (!current) return false;
    const fullPages = await listScansByGroupId(userId, domainId);
    if (fullPages.length === 0) return false;
    const base = {
        id: current.id,
        domain: current.domain,
        timestamp: current.timestamp,
        status: current.status,
        progress: current.progress,
        totalPages: current.totalPages,
        score: current.score,
        graph: current.graph,
        systemicIssues: current.systemicIssues,
        eeat: current.eeat,
    };
    const omitSlimPages = (await countDomainPagesInDb(domainId, userId)) > 0;
    const newPayload = buildStoredDomainPayload(fullPages, base, { omitSlimPages });
    const updated = await updateDomainScan(domainId, userId, newPayload);
    if (updated) invalidateDomainScan(domainId);
    return updated;
}
