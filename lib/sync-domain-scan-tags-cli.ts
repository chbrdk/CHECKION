import type { SyncDomainScanTagsMode } from '@/lib/db/sync-domain-scan-tags-from-projects';

/** CLI argv (`--mode=…`) wins over `CHECKION_SYNC_DOMAIN_SCAN_TAGS_MODE`; default `replaceFromProject`. */
export function resolveSyncDomainScanTagsMode(
    argv: string[],
    env: NodeJS.ProcessEnv
): SyncDomainScanTagsMode {
    for (const a of argv) {
        if (a === '--mode=fillEmpty') return 'fillEmpty';
        if (a === '--mode=replaceFromProject') return 'replaceFromProject';
    }
    const e = env.CHECKION_SYNC_DOMAIN_SCAN_TAGS_MODE?.trim();
    if (e === 'fillEmpty' || e === 'replaceFromProject') return e;
    return 'replaceFromProject';
}
