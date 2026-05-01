/**
 * API tests: GET /api/scans/domain (filters)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-api-token', () => ({ getRequestUser: vi.fn() }));
vi.mock('@/lib/auth-global-domain-list', () => ({ canListAllUsersDomainScans: vi.fn() }));
vi.mock('@/lib/cache', () => ({
    listCachedDomainScanSummaries: vi.fn().mockResolvedValue([]),
    getCachedDomainScansCount: vi.fn().mockResolvedValue(0),
}));
vi.mock('@/lib/db/scans', () => ({
    DOMAIN_SCAN_LIST_QUERY_MAX_LEN: 200,
    listDomainScanSummariesAllUsers: vi.fn().mockResolvedValue([]),
    getDomainScansCountAllUsers: vi.fn().mockResolvedValue(0),
}));

import { GET } from '@/app/api/scans/domain/route';
import { getRequestUser } from '@/lib/auth-api-token';
import { canListAllUsersDomainScans } from '@/lib/auth-global-domain-list';
import { listCachedDomainScanSummaries, getCachedDomainScansCount } from '@/lib/cache';
import { listDomainScanSummariesAllUsers, getDomainScansCountAllUsers } from '@/lib/db/scans';

describe('GET /api/scans/domain', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(canListAllUsersDomainScans).mockReset();
        vi.mocked(listCachedDomainScanSummaries).mockClear();
        vi.mocked(getCachedDomainScansCount).mockClear();
        vi.mocked(listDomainScanSummariesAllUsers).mockClear();
        vi.mocked(getDomainScansCountAllUsers).mockClear();
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
