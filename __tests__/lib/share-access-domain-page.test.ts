import { describe, expect, it } from 'vitest';
import { isSharedDomainPageAllowed } from '@/lib/share-access';
import type { DomainScanResult, ScanResult } from '@/lib/types';

describe('isSharedDomainPageAllowed', () => {
    const domain: DomainScanResult = {
        id: 'dom-1',
        domain: 'x.com',
        timestamp: 't',
        status: 'complete',
        progress: { scanned: 1, total: 1 },
        totalPages: 1,
        score: 80,
        pages: [],
        graph: { nodes: [], links: [] },
        systemicIssues: [],
    };

    it('allows when page is in payload list', () => {
        const d: DomainScanResult = { ...domain, pages: [{ id: 'p1', url: 'https://x.com/', score: 1, stats: { errors: 0, warnings: 0, notices: 0 } }] };
        const page = { id: 'p1', groupId: 'dom-1' } as ScanResult;
        expect(isSharedDomainPageAllowed(d, 'p1', page)).toBe(true);
    });

    it('allows when payload pages empty but groupId matches', () => {
        const page = { id: 'p2', groupId: 'dom-1' } as ScanResult;
        expect(isSharedDomainPageAllowed(domain, 'p2', page)).toBe(true);
    });

    it('denies when groupId does not match', () => {
        const page = { id: 'p3', groupId: 'other' } as ScanResult;
        expect(isSharedDomainPageAllowed(domain, 'p3', page)).toBe(false);
    });
});
