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
    listSharedProjectDomainScanSummariesForSearch: vi.fn(),
    listScansByGroupIdForSearch: vi.fn(),
    listStandaloneScansFull: vi.fn(),
    listSharedProjectStandaloneScansFull: vi.fn(),
}));

vi.mock('@/lib/db/projects', () => ({
    listProjects: vi.fn(),
}));

import { getRequestUser } from '@/lib/auth-api-token';
import {
    getDomainScan,
    listDomainScanSummariesForSearch,
    listScansByGroupIdForSearch,
    listSharedProjectDomainScanSummariesForSearch,
    listSharedProjectStandaloneScansFull,
    listStandaloneScansFull,
} from '@/lib/db/scans';
import { listProjects } from '@/lib/db/projects';

describe('GET /api/search — domain branch uses lightweight rows', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' } as any);
        vi.mocked(listProjects).mockResolvedValue([]);
        vi.mocked(listStandaloneScansFull).mockResolvedValue([]);
        vi.mocked(listSharedProjectStandaloneScansFull).mockResolvedValue([]);
        vi.mocked(listDomainScanSummariesForSearch).mockResolvedValue([]);
        vi.mocked(listSharedProjectDomainScanSummariesForSearch).mockResolvedValue([]);
        vi.mocked(listScansByGroupIdForSearch).mockReset();
        vi.mocked(getDomainScan).mockReset();
    });

    it('uses listScansByGroupIdForSearch when hasStoredAggregated, does not call getDomainScan', async () => {
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
        vi.mocked(listScansByGroupIdForSearch).mockResolvedValue([
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
        expect(listScansByGroupIdForSearch).toHaveBeenCalledWith('u1', 'd1');
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
        expect(listScansByGroupIdForSearch).not.toHaveBeenCalled();
    });

    it('uses owner context for shared-project domain rows', async () => {
        vi.mocked(listProjects).mockResolvedValue([
            { id: 'project-shared', userId: 'owner-1' },
        ] as any);
        vi.mocked(listSharedProjectDomainScanSummariesForSearch).mockResolvedValue([
            {
                id: 'd3',
                domain: 'shared.com',
                timestamp: 't',
                status: 'complete',
                score: 88,
                totalPages: 1,
                lineageVersion: 1,
                projectId: 'project-shared',
                userId: 'owner-1',
                industry: null,
                projectTags: [],
                tags: [],
                hasStoredAggregated: false,
            },
        ]);
        vi.mocked(getDomainScan).mockResolvedValue({
            id: 'd3',
            domain: 'shared.com',
            pages: [
                {
                    id: 'p3',
                    url: 'https://shared.com/path',
                    timestamp: 't',
                    score: 75,
                    issues: [{ message: 'shared token', code: 'z', type: 'a' as const }],
                },
            ],
        } as any);

        const req = new NextRequest('http://localhost/api/search?q=shared&type=domain');
        const res = await GET(req);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.matches.length).toBeGreaterThan(0);
        expect(listSharedProjectDomainScanSummariesForSearch).toHaveBeenCalledWith(['project-shared'], { limit: 30 });
        expect(getDomainScan).toHaveBeenCalledWith('d3', 'owner-1');
    });
});
