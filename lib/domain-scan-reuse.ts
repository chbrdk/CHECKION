import { v4 as uuidv4 } from 'uuid';
import type { ScanResult } from '@/lib/types';

/** Clone a prior scan row for a new domain run (new id, groupId, request URL, timestamp). */
export function cloneScanResultForReuse(
    source: ScanResult,
    domainScanId: string,
    requestUrl: string,
): ScanResult {
    return {
        ...source,
        id: uuidv4(),
        groupId: domainScanId,
        url: requestUrl,
        timestamp: new Date().toISOString(),
        reusedUnchanged: true,
    };
}
