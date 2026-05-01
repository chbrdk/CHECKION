/**
 * API tests: GET /api/scans/domain (filters)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-api-token', () => ({ getRequestUser: vi.fn() }));
vi.mock('@/lib/cache', () => ({
    listCachedDomainScanSummaries: vi.fn().mockResolvedValue([]),
    getCachedDomainScansCount: vi.fn().mockResolvedValue(0),
}));

import { GET } from '@/app/api/scans/domain/route';
import { getRequestUser } from '@/lib/auth-api-token';
import { listCachedDomainScanSummaries, getCachedDomainScansCount } from '@/lib/cache';

describe('GET /api/scans/domain', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(listCachedDomainScanSummaries).mockClear();
        vi.mocked(getCachedDomainScansCount).mockClear();
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
});
