/**
 * Copy project tags onto domain_scans.tags (backfill / realign).
 *
 *   DATABASE_URL=... npx tsx scripts/sync-domain-scan-tags-from-projects.ts
 *   DATABASE_URL=... npx tsx scripts/sync-domain-scan-tags-from-projects.ts --mode=fillEmpty
 *
 * Docker: set `CHECKION_SYNC_DOMAIN_SCAN_TAGS_ON_START=1` once — see
 * `knowledge/checkion-docker-sync-domain-scan-tags.md`.
 *
 * Optional env: `CHECKION_SYNC_DOMAIN_SCAN_TAGS_MODE=fillEmpty|replaceFromProject` (CLI `--mode=` overrides).
 */

import { invalidateDomainList } from '@/lib/cache';
import {
    listDistinctDomainScanUserIds,
    syncDomainScanTagsFromProjects,
} from '@/lib/db/sync-domain-scan-tags-from-projects';
import { resolveSyncDomainScanTagsMode } from '@/lib/sync-domain-scan-tags-cli';

async function main(): Promise<void> {
    const mode = resolveSyncDomainScanTagsMode(process.argv.slice(2), process.env);
    const updated = await syncDomainScanTagsFromProjects(mode);
    const userIds = await listDistinctDomainScanUserIds();
    for (const userId of userIds) {
        invalidateDomainList(userId);
    }
    console.log(
        JSON.stringify(
            {
                mode,
                updatedRows: updated,
                invalidatedUserListCaches: userIds.length,
            },
            null,
            2
        )
    );
}

void main().catch((e) => {
    console.error(e);
    process.exit(1);
});
