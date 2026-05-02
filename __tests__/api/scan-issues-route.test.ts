import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));

vi.mock('@/lib/db/index', () => ({
    getDb: vi.fn(),
}));

vi.mock('@/lib/db/scans', () => ({
    getScan: vi.fn(),
}));

vi.mock('@/lib/db/scan-issues-persist', () => ({
    listScanIssuesForScanId: vi.fn(),
}));

import { GET } from '@/app/api/scan/[id]/issues/route';
import { getRequestUser } from '@/lib/auth-api-token';
import { getScan } from '@/lib/db/scans';
import { listScanIssuesForScanId } from '@/lib/db/scan-issues-persist';

describe('GET /api/scan/[id]/issues', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(getScan).mockReset();
        vi.mocked(listScanIssuesForScanId).mockReset();
    });

    it('returns 401 when unauthenticated', async () => {
        vi.mocked(getRequestUser).mockResolvedValue(null);
        const req = new Request('http://localhost/api/scan/s1/issues');
        const res = await GET(req, { params: Promise.resolve({ id: 's1' }) });
        expect(res.status).toBe(401);
    });

    it('returns 404 when scan not accessible', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' });
        vi.mocked(getScan).mockResolvedValue(null);
        const req = new Request('http://localhost/api/scan/s1/issues');
        const res = await GET(req, { params: Promise.resolve({ id: 's1' }) });
        expect(res.status).toBe(404);
    });

    it('returns issues from scan_issues', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' });
        vi.mocked(getScan).mockResolvedValue({ issues: [] } as any);
        vi.mocked(listScanIssuesForScanId).mockResolvedValue([
            {
                code: 'c1',
                type: 'error',
                message: 'm1',
                context: '',
                selector: '',
                runner: 'axe',
                wcagLevel: 'AA',
                helpUrl: null,
                boundingBox: null,
            },
        ]);

        const req = new Request('http://localhost/api/scan/s1/issues');
        const res = await GET(req, { params: Promise.resolve({ id: 's1' }) });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.count).toBe(1);
        expect(json.data[0].code).toBe('c1');
    });
});
