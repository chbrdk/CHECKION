import { describe, expect, it } from 'vitest';
import { parseDomainPayloadRefreshCliArgs } from '@/lib/domain-payload-refresh-batch';

describe('parseDomainPayloadRefreshCliArgs', () => {
    it('defaults to complete scans only', () => {
        const r = parseDomainPayloadRefreshCliArgs([]);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.options.filterByStatus).toBe(true);
        expect(r.options.status).toBe('complete');
        expect(r.options.dryRun).toBe(false);
    });

    it('parses filters and dry-run', () => {
        const r = parseDomainPayloadRefreshCliArgs([
            '--dry-run',
            '--user=u1',
            '--id=dom-1',
            '--status=error',
            '--limit=10',
        ]);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.options.dryRun).toBe(true);
        expect(r.options.userId).toBe('u1');
        expect(r.options.domainScanId).toBe('dom-1');
        expect(r.options.status).toBe('error');
        expect(r.options.limit).toBe(10);
    });

    it('--all-status disables status filter', () => {
        const r = parseDomainPayloadRefreshCliArgs(['--all-status']);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.options.filterByStatus).toBe(false);
        expect(r.options.status).toBeUndefined();
    });

    it('returns help sentinel for -h', () => {
        const r = parseDomainPayloadRefreshCliArgs(['-h']);
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.help).toBe(true);
    });
});
