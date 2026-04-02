import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}));
vi.mock('@/lib/rate-limit', () => ({
    checkRateLimit: () => ({ allowed: true, remaining: 999 }),
}));
vi.mock('@/lib/db/scans', () => ({
    getDomainScan: vi.fn(),
}));
vi.mock('@/lib/db/domain-issues', () => ({
    listIssueGroupsPaged: vi.fn(),
}));

import { auth } from '@/auth';
import { getDomainScan } from '@/lib/db/scans';
import { listIssueGroupsPaged } from '@/lib/db/domain-issues';
import { GET } from '@/app/api/scan/domain/[id]/issue-groups/route';

describe('GET /api/scan/domain/[id]/issue-groups', () => {
    beforeEach(() => {
        vi.mocked(auth).mockReset();
        vi.mocked(getDomainScan).mockReset();
        vi.mocked(listIssueGroupsPaged).mockReset();
    });

    it('returns 401 when unauthenticated', async () => {
        vi.mocked(auth).mockResolvedValue(null);
        const req = new Request('http://localhost/api/scan/domain/scan-1/issue-groups');
        const res = await GET(req as any, { params: Promise.resolve({ id: 'scan-1' }) });
        expect(res.status).toBe(401);
    });

    it('returns 404 when scan does not exist', async () => {
        vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1', email: 't@t.de' }, expires: '' });
        vi.mocked(getDomainScan).mockResolvedValue(null as any);
        const req = new Request('http://localhost/api/scan/domain/scan-1/issue-groups?limit=10');
        const res = await GET(req as any, { params: Promise.resolve({ id: 'scan-1' }) });
        expect(res.status).toBe(404);
    });

    it('returns paged groups with cache header', async () => {
        vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1', email: 't@t.de' }, expires: '' });
        vi.mocked(getDomainScan).mockResolvedValue({ id: 'scan-1' } as any);
        vi.mocked(listIssueGroupsPaged).mockResolvedValue({
            data: [
                { groupKey: 'g1', type: 'error', code: 'C1', message: 'M1', runner: 'axe', wcagLevel: 'AA', helpUrl: null, pageCount: 3 },
            ],
            nextCursor: { pageCount: 3, groupKey: 'g1' },
        } as any);

        const req = new Request('http://localhost/api/scan/domain/scan-1/issue-groups?limit=1');
        const res = await GET(req as any, { params: Promise.resolve({ id: 'scan-1' }) });
        expect(res.status).toBe(200);
        expect(res.headers.get('Cache-Control')).toMatch(/max-age=60/);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.length).toBe(1);
        expect(json.pagination.nextCursor).toEqual({ pageCount: 3, groupKey: 'g1' });
    });
});

