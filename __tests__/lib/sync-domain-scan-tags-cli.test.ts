import { describe, it, expect } from 'vitest';
import { resolveSyncDomainScanTagsMode } from '@/lib/sync-domain-scan-tags-cli';

describe('resolveSyncDomainScanTagsMode', () => {
    it('defaults to replaceFromProject', () => {
        expect(resolveSyncDomainScanTagsMode([], {})).toBe('replaceFromProject');
    });

    it('reads CHECKION_SYNC_DOMAIN_SCAN_TAGS_MODE', () => {
        expect(
            resolveSyncDomainScanTagsMode([], { CHECKION_SYNC_DOMAIN_SCAN_TAGS_MODE: 'fillEmpty' })
        ).toBe('fillEmpty');
    });

    it('prefers argv --mode= over env', () => {
        expect(
            resolveSyncDomainScanTagsMode(['--mode=replaceFromProject'], {
                CHECKION_SYNC_DOMAIN_SCAN_TAGS_MODE: 'fillEmpty',
            })
        ).toBe('replaceFromProject');
    });
});
