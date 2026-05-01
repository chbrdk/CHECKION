import { describe, it, expect } from 'vitest';
import { buildDomainScanLineageKey } from '@/lib/domain-scan-lineage';

describe('buildDomainScanLineageKey', () => {
    it('joins user, project, and normalized host', () => {
        expect(buildDomainScanLineageKey('u1', 'p1', 'https://Example.COM/path')).toBe('u1|p1|example.com');
    });

    it('uses empty segment when project is null', () => {
        expect(buildDomainScanLineageKey('u1', null, 'foo.org')).toBe('u1||foo.org');
    });

    it('treats same host with different projects as different lineages', () => {
        expect(buildDomainScanLineageKey('u1', 'p-a', 'foo.org')).not.toBe(
            buildDomainScanLineageKey('u1', 'p-b', 'foo.org')
        );
    });
});
