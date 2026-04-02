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
    countDomainIssueGroupsForScan: vi.fn(),
}));
vi.mock('@/lib/domain-issues-backfill', () => ({
    ensureDomainIssueTablesBackfilled: vi.fn(),
}));

import { auth } from '@/auth';
import { getDomainScan } from '@/lib/db/scans';
import { countDomainIssueGroupsForScan, listIssueGroupsPaged } from '@/lib/db/domain-issues';
import { ensureDomainIssueTablesBackfilled } from '@/lib/domain-issues-backfill';
import { GET } from '@/app/api/scan/domain/[id]/issue-groups/route';

describe('GET /api/scan/domain/[id]/issue-groups', () => {
    beforeEach(() => {
        vi.mocked(auth).mockReset();
        vi.mocked(getDomainScan).mockReset();
        vi.mocked(listIssueGroupsPaged).mockReset();
        vi.mocked(countDomainIssueGroupsForScan).mockReset();
        vi.mocked(ensureDomainIssueTablesBackfilled).mockReset();
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
        expect(countDomainIssueGroupsForScan).not.toHaveBeenCalled();
        expect(ensureDomainIssueTablesBackfilled).not.toHaveBeenCalled();
    });

    it('does not backfill when first page is empty but groups already exist (e.g. race or rebuild)', async () => {
        vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1', email: 't@t.de' }, expires: '' });
        vi.mocked(getDomainScan).mockResolvedValue({ id: 'scan-1', status: 'complete' } as any);
        vi.mocked(listIssueGroupsPaged).mockResolvedValue({ data: [], nextCursor: null } as any);
        vi.mocked(countDomainIssueGroupsForScan).mockResolvedValue(5);

        const req = new Request('http://localhost/api/scan/domain/scan-1/issue-groups?limit=50');
        const res = await GET(req as any, { params: Promise.resolve({ id: 'scan-1' }) });
        expect(res.status).toBe(200);
        await vi.waitFor(() => {
            expect(ensureDomainIssueTablesBackfilled).not.toHaveBeenCalled();
        });
    });

    it('triggers backfill when complete scan has zero groups on first unfiltered page', async () => {
        vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1', email: 't@t.de' }, expires: '' });
        vi.mocked(getDomainScan).mockResolvedValue({ id: 'scan-1', status: 'complete' } as any);
        vi.mocked(listIssueGroupsPaged).mockResolvedValue({ data: [], nextCursor: null } as any);
        vi.mocked(countDomainIssueGroupsForScan).mockResolvedValue(0);
        vi.mocked(ensureDomainIssueTablesBackfilled).mockResolvedValue(undefined as any);

        const req = new Request('http://localhost/api/scan/domain/scan-1/issue-groups?limit=50');
        const res = await GET(req as any, { params: Promise.resolve({ id: 'scan-1' }) });
        expect(res.status).toBe(200);
        await vi.waitFor(() => {
            expect(ensureDomainIssueTablesBackfilled).toHaveBeenCalledTimes(1);
        });
    });

    it('does not count or backfill when type filter is applied', async () => {
        vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1', email: 't@t.de' }, expires: '' });
        vi.mocked(getDomainScan).mockResolvedValue({ id: 'scan-1', status: 'complete' } as any);
        vi.mocked(listIssueGroupsPaged).mockResolvedValue({ data: [], nextCursor: null } as any);

        const req = new Request('http://localhost/api/scan/domain/scan-1/issue-groups?limit=50&type=error');
        const res = await GET(req as any, { params: Promise.resolve({ id: 'scan-1' }) });
        expect(res.status).toBe(200);
        expect(countDomainIssueGroupsForScan).not.toHaveBeenCalled();
        expect(ensureDomainIssueTablesBackfilled).not.toHaveBeenCalled();
    });
});

