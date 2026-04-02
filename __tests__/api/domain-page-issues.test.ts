import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: () => ({ allowed: true, remaining: 999 }) }));
vi.mock('@/lib/db/scans', () => ({ getDomainScan: vi.fn() }));
vi.mock('@/lib/db/domain-issues', () => ({ listPageIssuesPaged: vi.fn() }));

import { auth } from '@/auth';
import { getDomainScan } from '@/lib/db/scans';
import { listPageIssuesPaged } from '@/lib/db/domain-issues';
import { GET } from '@/app/api/scan/domain/[id]/pages/[pageId]/issues/route';

describe('GET /api/scan/domain/[id]/pages/[pageId]/issues', () => {
    beforeEach(() => {
        vi.mocked(auth).mockReset();
        vi.mocked(getDomainScan).mockReset();
        vi.mocked(listPageIssuesPaged).mockReset();
    });

    it('returns 401 when unauthenticated', async () => {
        vi.mocked(auth).mockResolvedValue(null);
        const req = new Request('http://localhost/api/scan/domain/scan-1/pages/p1/issues');
        const res = await GET(req as any, { params: Promise.resolve({ id: 'scan-1', pageId: 'p1' }) });
        expect(res.status).toBe(401);
    });

    it('returns issues for a page', async () => {
        vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1', email: 't@t.de' }, expires: '' });
        vi.mocked(getDomainScan).mockResolvedValue({ id: 'scan-1' } as any);
        vi.mocked(listPageIssuesPaged).mockResolvedValue({
            data: [{ id: 'i1', groupKey: 'g1', type: 'error', code: 'C1', message: 'M1', runner: 'axe', wcagLevel: 'AA', helpUrl: null, selector: null }],
            nextCursor: null,
        } as any);

        const req = new Request('http://localhost/api/scan/domain/scan-1/pages/p1/issues?limit=100');
        const res = await GET(req as any, { params: Promise.resolve({ id: 'scan-1', pageId: 'p1' }) });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data[0].id).toBe('i1');
    });
});

