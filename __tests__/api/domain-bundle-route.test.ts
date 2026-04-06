import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));
vi.mock('@/lib/domain-bundle', () => ({
    buildDomainBundleForUser: vi.fn(),
}));

import { getRequestUser } from '@/lib/auth-api-token';
import { buildDomainBundleForUser } from '@/lib/domain-bundle';
import { GET } from '@/app/api/scan/domain/[id]/bundle/route';

describe('GET /api/scan/domain/[id]/bundle', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(buildDomainBundleForUser).mockReset();
    });

    it('returns 401 when unauthenticated', async () => {
        vi.mocked(getRequestUser).mockResolvedValue(null);
        const res = await GET(new Request('http://localhost/api/scan/domain/x/bundle') as any, {
            params: Promise.resolve({ id: 'x' }),
        });
        expect(res.status).toBe(401);
    });

    it('returns 404 when bundle builder returns null', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' } as any);
        vi.mocked(buildDomainBundleForUser).mockResolvedValue(null);
        const res = await GET(new Request('http://localhost/api/scan/domain/missing/bundle') as any, {
            params: Promise.resolve({ id: 'missing' }),
        });
        expect(res.status).toBe(404);
    });

    it('returns JSON with totalSlimRows and empty pages array', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' } as any);
        vi.mocked(buildDomainBundleForUser).mockResolvedValue({
            id: 'd1',
            domain: 'ex.com',
            timestamp: '2020-01-01T00:00:00Z',
            status: 'complete',
            progress: 100,
            totalPages: 3,
            score: 80,
            graph: { nodes: [], edges: [] },
            pages: [],
            totalPageCount: 3,
            aggregated: null as any,
            summaryMeta: { slimPagesOmitted: true, seoPageRowsOmitted: true },
            projectId: 'p1',
            totalSlimRows: 3,
        });
        const res = await GET(new Request('http://localhost/api/scan/domain/d1/bundle') as any, {
            params: Promise.resolve({ id: 'd1' }),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.totalSlimRows).toBe(3);
        expect(body.pages).toEqual([]);
        expect(body.projectId).toBe('p1');
        expect(buildDomainBundleForUser).toHaveBeenCalledWith('d1', 'u1');
    });
});
