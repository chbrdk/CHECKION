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
vi.mock('@/lib/db/domain-slim-pages', () => ({
    countDomainPagesInDb: vi.fn(),
    listSlimPagesFromDomainPagesTable: vi.fn(),
    sliceSlimPagesFromPayload: vi.fn(),
    countPayloadPages: vi.fn(),
}));

import { getRequestUser } from '@/lib/auth-api-token';
import { getDomainScan } from '@/lib/db/scans';
import {
    countDomainPagesInDb,
    listSlimPagesFromDomainPagesTable,
    sliceSlimPagesFromPayload,
    countPayloadPages,
} from '@/lib/db/domain-slim-pages';
import { GET } from '@/app/api/scan/domain/[id]/slim-pages/route';

describe('GET /api/scan/domain/[id]/slim-pages', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(getDomainScan).mockReset();
        vi.mocked(countDomainPagesInDb).mockReset();
        vi.mocked(listSlimPagesFromDomainPagesTable).mockReset();
        vi.mocked(sliceSlimPagesFromPayload).mockReset();
        vi.mocked(countPayloadPages).mockReset();
    });

    it('returns 401 when unauthenticated', async () => {
        vi.mocked(getRequestUser).mockResolvedValue(null);
        const req = new Request('http://localhost/api/scan/domain/s1/slim-pages');
        const res = await GET(req as any, { params: Promise.resolve({ id: 's1' }) });
        expect(res.status).toBe(401);
    });

    it('returns DB page when domain_pages has rows', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' });
        vi.mocked(countDomainPagesInDb).mockResolvedValue(2);
        vi.mocked(listSlimPagesFromDomainPagesTable).mockResolvedValue([
            {
                id: 'scan-a',
                domainPageId: 'dp_x',
                url: 'https://ex.com/a',
                score: 80,
                stats: { errors: 1, warnings: 0, notices: 0 },
            },
        ]);
        const req = new Request('http://localhost/api/scan/domain/s1/slim-pages?offset=0&limit=50');
        const res = await GET(req as any, { params: Promise.resolve({ id: 's1' }) });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.source).toBe('db');
        expect(body.total).toBe(2);
        expect(body.data).toHaveLength(1);
        expect(listSlimPagesFromDomainPagesTable).toHaveBeenCalledWith({
            domainScanId: 's1',
            userId: 'u1',
            offset: 0,
            limit: 50,
        });
    });

    it('falls back to payload slice when no domain_pages', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' });
        vi.mocked(countDomainPagesInDb).mockResolvedValue(0);
        vi.mocked(getDomainScan).mockResolvedValue({ pages: [{ id: 'p1', url: 'https://x.com', score: 1 }] } as any);
        vi.mocked(countPayloadPages).mockReturnValue(1);
        vi.mocked(sliceSlimPagesFromPayload).mockReturnValue([
            { id: 'p1', url: 'https://x.com', score: 1, stats: { errors: 0, warnings: 0, notices: 0 } },
        ]);
        const req = new Request('http://localhost/api/scan/domain/s1/slim-pages');
        const res = await GET(req as any, { params: Promise.resolve({ id: 's1' }) });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.source).toBe('payload');
        expect(sliceSlimPagesFromPayload).toHaveBeenCalled();
    });
});
