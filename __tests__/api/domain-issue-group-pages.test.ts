import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: () => ({ allowed: true, remaining: 999 }) }));
vi.mock('@/lib/db/scans', () => ({ getDomainScan: vi.fn() }));
vi.mock('@/lib/db/domain-issues', () => ({ listGroupPagesPaged: vi.fn() }));

import { auth } from '@/auth';
import { getDomainScan } from '@/lib/db/scans';
import { listGroupPagesPaged } from '@/lib/db/domain-issues';
import { GET } from '@/app/api/scan/domain/[id]/issue-groups/[groupKey]/pages/route';

describe('GET /api/scan/domain/[id]/issue-groups/[groupKey]/pages', () => {
    beforeEach(() => {
        vi.mocked(auth).mockReset();
        vi.mocked(getDomainScan).mockReset();
        vi.mocked(listGroupPagesPaged).mockReset();
    });

    it('returns 401 when unauthenticated', async () => {
        vi.mocked(auth).mockResolvedValue(null);
        const req = new Request('http://localhost/api/scan/domain/scan-1/issue-groups/g1/pages');
        const res = await GET(req as any, { params: Promise.resolve({ id: 'scan-1', groupKey: 'g1' }) });
        expect(res.status).toBe(401);
    });

    it('returns pages for a group', async () => {
        vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1', email: 't@t.de' }, expires: '' });
        vi.mocked(getDomainScan).mockResolvedValue({ id: 'scan-1' } as any);
        vi.mocked(listGroupPagesPaged).mockResolvedValue({
            data: [{ pageId: 'p1', url: 'https://example.com/a', issueCount: 2, scanId: 'scan-row-1' }],
            nextCursor: null,
        } as any);

        const req = new Request('http://localhost/api/scan/domain/scan-1/issue-groups/g1/pages?limit=50');
        const res = await GET(req as any, { params: Promise.resolve({ id: 'scan-1', groupKey: 'g1' }) });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data[0].pageId).toBe('p1');
        expect(json.data[0].scanId).toBe('scan-row-1');
    });
});

