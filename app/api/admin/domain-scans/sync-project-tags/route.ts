/* POST /api/admin/domain-scans/sync-project-tags — admin API key; backfill domain_scans.tags from projects.tags */
import { NextResponse } from 'next/server';
import { isAdminApiRequest } from '@/lib/auth-admin-api';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, adminSyncDomainScanTagsBodySchema } from '@/lib/api-schemas';
import { invalidateDomainList, invalidateScansList } from '@/lib/cache';
import {
    listDistinctDomainScanUserIds,
    syncDomainScanTagsFromProjects,
    type SyncDomainScanTagsMode,
} from '@/lib/db/sync-domain-scan-tags-from-projects';
import {
    listDistinctStandaloneScanUserIds,
    syncStandaloneScansTagsFromProjects,
    type SyncStandaloneScanTagsMode,
} from '@/lib/db/sync-standalone-scan-tags-from-projects';

export async function POST(request: Request) {
    if (!isAdminApiRequest(request)) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }

    const parsed = await parseApiBody(request, adminSyncDomainScanTagsBodySchema);
    if (parsed instanceof NextResponse) return parsed;

    const mode: SyncDomainScanTagsMode = parsed.mode ?? 'replaceFromProject';
    const standaloneMode: SyncStandaloneScanTagsMode = mode;

    const updatedDomain = await syncDomainScanTagsFromProjects(mode);
    const updatedStandalone = await syncStandaloneScansTagsFromProjects(standaloneMode);

    const domainUserIds = await listDistinctDomainScanUserIds();
    const standaloneUserIds = await listDistinctStandaloneScanUserIds();
    const allUserIds = [...new Set([...domainUserIds, ...standaloneUserIds])];
    for (const userId of allUserIds) {
        invalidateDomainList(userId);
        invalidateScansList(userId);
    }

    return NextResponse.json({
        success: true,
        mode,
        updatedDomainScanRows: updatedDomain,
        updatedStandaloneScanRows: updatedStandalone,
        invalidatedUserListCaches: allUserIds.length,
    });
}
