/* POST /api/admin/domain-scans/sync-project-tags — admin API key; backfill domain_scans.tags from projects.tags */
import { NextResponse } from 'next/server';
import { isAdminApiRequest } from '@/lib/auth-admin-api';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, adminSyncDomainScanTagsBodySchema } from '@/lib/api-schemas';
import { invalidateDomainList } from '@/lib/cache';
import {
    listDistinctDomainScanUserIds,
    syncDomainScanTagsFromProjects,
    type SyncDomainScanTagsMode,
} from '@/lib/db/sync-domain-scan-tags-from-projects';

export async function POST(request: Request) {
    if (!isAdminApiRequest(request)) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }

    const parsed = await parseApiBody(request, adminSyncDomainScanTagsBodySchema);
    if (parsed instanceof NextResponse) return parsed;

    const mode: SyncDomainScanTagsMode = parsed.mode ?? 'replaceFromProject';
    const updated = await syncDomainScanTagsFromProjects(mode);
    const userIds = await listDistinctDomainScanUserIds();
    for (const userId of userIds) {
        invalidateDomainList(userId);
    }

    return NextResponse.json({
        success: true,
        mode,
        updatedRows: updated,
        invalidatedUserListCaches: userIds.length,
    });
}
