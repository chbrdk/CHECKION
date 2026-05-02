import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next/cache', () => ({
    unstable_cache: <T>(fn: () => T | Promise<T>) => fn,
}));

import { GET } from '@/app/api/search/route';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));

vi.mock('@/lib/db/scans', () => ({
    getDomainScan: vi.fn(),
    listDomainScanSummariesForSearch: vi.fn(),
    listScansByGroupIdOmitImageBlobs: vi.fn(),
    listStandaloneScansFull: vi.fn(),
}));

import { getRequestUser } from '@/lib/auth-api-token';
import { getDomainScan, listDomainScanSummariesForSearch, listScansByGroupIdOmitImageBlobs, listStandaloneScansFull } from '@/lib/db/scans';

describe('GET /api/search — domain branch uses lightweight rows', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' } as any);
        vi.mocked(listStandaloneScansFull).mockResolvedValue([]);
        vi.mocked(listDomainScanSummariesForSearch).mockReset();
        vi.mocked(listScansByGroupIdOmitImageBlobs).mockReset();
        vi.mocked(getDomainScan).mockReset();
    });

    it('uses listScansByGroupIdOmitImageBlobs when hasStoredAggregated, does not call getDomainScan', async () => {
        vi.mocked(listDomainScanSummariesForSearch).mockResolvedValue([
            {
                id: 'd1',
                domain: 'example.com',
                timestamp: 't',
                status: 'complete',
                score: 80,
                totalPages: 1,
                lineageVersion: 1,
                projectId: null,
                userId: 'u1',
                industry: null,
                projectTags: [],
                tags: [],
                hasStoredAggregated: true,
            },
        ]);
        vi.mocked(listScansByGroupIdOmitImageBlobs).mockResolvedValue([
            {
                id: 'p1',
                url: 'https://example.com/foo',
                timestamp: 't',
                score: 90,
                issues: [{ message: 'hello tokenxyz', code: 'x', type: 'a' as const }],
            } as any,
        ]);

        const req = new NextRequest('http://localhost/api/search?q=tokenxyz&type=domain');
        const res = await GET(req);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.matches.length).toBeGreaterThan(0);
        expect(listScansByGroupIdOmitImageBlobs).toHaveBeenCalledWith('u1', 'd1');
        expect(getDomainScan).not.toHaveBeenCalled();
    });

    it('calls getDomainScan for legacy domain without aggregated', async () => {
        vi.mocked(listDomainScanSummariesForSearch).mockResolvedValue([
            {
                id: 'd2',
                domain: 'legacy.com',
                timestamp: 't',
                status: 'complete',
                score: 50,
                totalPages: 1,
                lineageVersion: 1,
                projectId: null,
                userId: 'u1',
                industry: null,
                projectTags: [],
                tags: [],
                hasStoredAggregated: false,
            },
        ]);
        vi.mocked(getDomainScan).mockResolvedValue({
            id: 'd2',
            domain: 'legacy.com',
            pages: [
                {
                    id: 'p2',
                    url: 'https://legacy.com/bar',
                    timestamp: 't',
                    score: 70,
                    issues: [{ message: 'legacy tokenabc', code: 'y', type: 'a' as const }],
                },
            ],
        } as any);

        const req = new NextRequest('http://localhost/api/search?q=tokenabc&type=domain');
        const res = await GET(req);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.matches.length).toBeGreaterThan(0);
        expect(getDomainScan).toHaveBeenCalledWith('d2', 'u1');
        expect(listScansByGroupIdOmitImageBlobs).not.toHaveBeenCalled();
    });
});
