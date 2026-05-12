/**
 * API tests: GET /api/scans/domain (filters)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-api-token', () => ({ getRequestUser: vi.fn() }));
vi.mock('@/lib/auth-global-domain-list', () => ({ canListAllUsersDomainScans: vi.fn() }));
vi.mock('@/lib/db/projects', () => ({ getProject: vi.fn(), listProjects: vi.fn() }));
vi.mock('@/lib/cache', () => ({
    listCachedDomainScanSummaries: vi.fn().mockResolvedValue([]),
    getCachedDomainScansCount: vi.fn().mockResolvedValue(0),
}));
vi.mock('@/lib/db/scans', () => ({
    DOMAIN_SCAN_LIST_QUERY_MAX_LEN: 200,
    listDomainScanSummariesAllUsers: vi.fn().mockResolvedValue([]),
    getDomainScansCountAllUsers: vi.fn().mockResolvedValue(0),
    listSharedProjectDomainScanSummaries: vi.fn().mockResolvedValue([]),
    getSharedProjectDomainScansCount: vi.fn().mockResolvedValue(0),
}));

import { GET } from '@/app/api/scans/domain/route';
import { getRequestUser } from '@/lib/auth-api-token';
import { canListAllUsersDomainScans } from '@/lib/auth-global-domain-list';
import { getProject, listProjects } from '@/lib/db/projects';
import { listCachedDomainScanSummaries, getCachedDomainScansCount } from '@/lib/cache';
import {
    getDomainScansCountAllUsers,
    getSharedProjectDomainScansCount,
    listDomainScanSummariesAllUsers,
    listSharedProjectDomainScanSummaries,
} from '@/lib/db/scans';

describe('GET /api/scans/domain', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(canListAllUsersDomainScans).mockReset();
        vi.mocked(listCachedDomainScanSummaries).mockClear();
        vi.mocked(getCachedDomainScansCount).mockClear();
        vi.mocked(listDomainScanSummariesAllUsers).mockClear();
        vi.mocked(getDomainScansCountAllUsers).mockClear();
        vi.mocked(listSharedProjectDomainScanSummaries).mockClear();
        vi.mocked(getSharedProjectDomainScansCount).mockClear();
        vi.mocked(getProject).mockReset();
        vi.mocked(listProjects).mockResolvedValue([]);
    });

    it('passes q and status to cache helpers', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        const req = new NextRequest('http://localhost/api/scans/domain?q=example.com&status=complete&page=1');
        const res = await GET(req);
        expect(res.status).toBe(200);
        expect(listCachedDomainScanSummaries).toHaveBeenCalledWith(
            'user-1',
            expect.objectContaining({
                q: 'example.com',
                status: 'complete',
            })
        );
        expect(getCachedDomainScansCount).toHaveBeenCalledWith(
            'user-1',
            expect.objectContaining({
                q: 'example.com',
                status: 'complete',
            })
        );
    });

    it('omits project filter when projectId query absent', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        const req = new NextRequest('http://localhost/api/scans/domain');
        await GET(req);
        expect(listCachedDomainScanSummaries).toHaveBeenCalledWith(
            'user-1',
            expect.objectContaining({
                projectId: undefined,
            })
        );
    });

    it('uses the project owner user id for shared project filters', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'viewer-1' } as never);
        vi.mocked(getProject).mockResolvedValue({
            id: '11111111-1111-4111-8111-111111111111',
            userId: 'owner-1',
        } as never);
        const req = new NextRequest(
            'http://localhost/api/scans/domain?projectId=11111111-1111-4111-8111-111111111111'
        );
        const res = await GET(req);
        expect(res.status).toBe(200);
        expect(listCachedDomainScanSummaries).toHaveBeenCalledWith(
            'owner-1',
            expect.objectContaining({
                projectId: '11111111-1111-4111-8111-111111111111',
            })
        );
        expect(getCachedDomainScansCount).toHaveBeenCalledWith(
            'owner-1',
            expect.objectContaining({
                projectId: '11111111-1111-4111-8111-111111111111',
            })
        );
    });

    it('merges shared project domain rows when project filter is absent', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'viewer-1' } as never);
        vi.mocked(listProjects).mockResolvedValue([
            { id: '22222222-2222-4222-8222-222222222222', userId: 'owner-1' },
        ] as never);
        vi.mocked(listCachedDomainScanSummaries).mockResolvedValue([
            {
                id: 'domain-own',
                domain: 'own.example',
                timestamp: '2026-05-12T20:00:00.000Z',
                status: 'complete',
                score: 80,
                totalPages: 3,
                lineageVersion: 1,
                projectId: null,
                userId: 'viewer-1',
                industry: null,
                projectTags: [],
                tags: [],
            },
        ] as never);
        vi.mocked(getCachedDomainScansCount).mockResolvedValue(1 as never);
        vi.mocked(listSharedProjectDomainScanSummaries).mockResolvedValue([
            {
                id: 'domain-shared',
                domain: 'shared.example',
                timestamp: '2026-05-12T21:00:00.000Z',
                status: 'complete',
                score: 90,
                totalPages: 4,
                lineageVersion: 1,
                projectId: '22222222-2222-4222-8222-222222222222',
                userId: 'owner-1',
                industry: null,
                projectTags: [],
                tags: [],
            },
        ] as never);
        vi.mocked(getSharedProjectDomainScansCount).mockResolvedValue(1 as never);

        const req = new NextRequest('http://localhost/api/scans/domain?limit=10&page=1');
        const res = await GET(req);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.map((item: { id: string }) => item.id)).toEqual(['domain-shared', 'domain-own']);
        expect(body.pagination.total).toBe(2);
        expect(listSharedProjectDomainScanSummaries).toHaveBeenCalledWith(
            ['22222222-2222-4222-8222-222222222222'],
            expect.objectContaining({ limit: 10, offset: 0 })
        );
        expect(getSharedProjectDomainScansCount).toHaveBeenCalledWith(
            ['22222222-2222-4222-8222-222222222222'],
            expect.any(Object)
        );
    });

    it('returns 403 for scope=allUsers when not allowed', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        vi.mocked(canListAllUsersDomainScans).mockReturnValue(false);
        const req = new NextRequest('http://localhost/api/scans/domain?scope=allUsers');
        const res = await GET(req);
        expect(res.status).toBe(403);
        expect(listDomainScanSummariesAllUsers).not.toHaveBeenCalled();
    });

    it('lists all users when scope=allUsers and allowed', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        vi.mocked(canListAllUsersDomainScans).mockReturnValue(true);
        const req = new NextRequest('http://localhost/api/scans/domain?scope=allUsers&page=2&limit=10');
        const res = await GET(req);
        expect(res.status).toBe(200);
        const body = (await res.json()) as { scope?: string };
        expect(body.scope).toBe('allUsers');
        expect(listDomainScanSummariesAllUsers).toHaveBeenCalledWith(
            expect.objectContaining({ limit: 10, offset: 10 })
        );
        expect(getDomainScansCountAllUsers).toHaveBeenCalled();
        expect(listCachedDomainScanSummaries).not.toHaveBeenCalled();
    });
});
