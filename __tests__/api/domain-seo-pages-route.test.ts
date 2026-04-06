import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/rate-limit', () => ({
    checkRateLimit: () => ({ allowed: true, remaining: 999 }),
}));
vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));
vi.mock('@/lib/db/scans', () => ({
    getDomainScan: vi.fn(),
}));
vi.mock('@/lib/db/domain-seo-pages', () => ({
    listSeoPageRowsFromDb: vi.fn(),
    sliceSeoPagesFromPayload: vi.fn(),
}));

import { getRequestUser } from '@/lib/auth-api-token';
import { getDomainScan } from '@/lib/db/scans';
import { listSeoPageRowsFromDb, sliceSeoPagesFromPayload } from '@/lib/db/domain-seo-pages';
import { GET } from '@/app/api/scan/domain/[id]/seo-pages/route';

describe('GET /api/scan/domain/[id]/seo-pages', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(getDomainScan).mockReset();
        vi.mocked(listSeoPageRowsFromDb).mockReset();
        vi.mocked(sliceSeoPagesFromPayload).mockReset();
    });

    it('returns 401 when unauthenticated', async () => {
        vi.mocked(getRequestUser).mockResolvedValue(null);
        const req = new Request('http://localhost/api/scan/domain/s1/seo-pages');
        const res = await GET(req as any, { params: Promise.resolve({ id: 's1' }) });
        expect(res.status).toBe(401);
    });

    it('returns DB rows when listSeoPageRowsFromDb has total > 0', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' } as any);
        vi.mocked(listSeoPageRowsFromDb).mockResolvedValue({
            total: 2,
            rows: [
                {
                    url: 'https://ex.com/a',
                    title: 'A',
                    hasMeta: true,
                    hasH1: true,
                    wordCount: 400,
                    topKeywordCount: 2,
                    isSkinny: false,
                },
            ],
        });
        const req = new Request('http://localhost/api/scan/domain/s1/seo-pages?offset=0&limit=50&sort=wordCount&dir=desc');
        const res = await GET(req as any, { params: Promise.resolve({ id: 's1' }) });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.source).toBe('db');
        expect(body.total).toBe(2);
        expect(body.data).toHaveLength(1);
        expect(listSeoPageRowsFromDb).toHaveBeenCalledWith(
            expect.objectContaining({
                domainScanId: 's1',
                userId: 'u1',
                offset: 0,
                limit: 50,
                sort: 'wordCount',
                sortDir: 'desc',
            })
        );
    });

    it('falls back to payload slice when DB returns no rows', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' } as any);
        vi.mocked(listSeoPageRowsFromDb).mockResolvedValue({ total: 0, rows: [] });
        vi.mocked(getDomainScan).mockResolvedValue({ aggregated: { seo: { pages: [] } } } as any);
        vi.mocked(sliceSeoPagesFromPayload).mockReturnValue({ total: 0, rows: [] });
        const req = new Request('http://localhost/api/scan/domain/s1/seo-pages');
        const res = await GET(req as any, { params: Promise.resolve({ id: 's1' }) });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.source).toBe('payload');
        expect(sliceSeoPagesFromPayload).toHaveBeenCalled();
    });
});
