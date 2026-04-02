/**
 * GET /api/scan/domain/[id]/summary?seoFull=1 — small payload for Tab 7 (aggregated.seo only).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));
vi.mock('@/lib/db/scans', () => ({
    getDomainScanWithProjectId: vi.fn(),
}));
vi.mock('@/lib/domain-summary', () => ({
    buildDomainSummary: vi.fn(() => ({
        aggregated: {
            seo: {
                pages: [{ url: 'https://example.com/p', title: 'P' }],
            },
        },
    })),
    toLightDomainSummaryApiPayload: vi.fn(),
}));

import { getRequestUser } from '@/lib/auth-api-token';
import { getDomainScanWithProjectId } from '@/lib/db/scans';
import { GET } from '@/app/api/scan/domain/[id]/summary/route';

describe('GET /api/scan/domain/[id]/summary?seoFull=1', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(getDomainScanWithProjectId).mockReset();
    });

    it('returns 401 when unauthenticated', async () => {
        vi.mocked(getRequestUser).mockResolvedValue(null);
        const req = new Request('http://localhost/api/scan/domain/d1/summary?seoFull=1');
        const res = await GET(req, { params: Promise.resolve({ id: 'd1' }) });
        expect(res.status).toBe(401);
    });

    it('returns only projectId, aggregated.seo, and summaryMeta without pages or graph', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' });
        vi.mocked(getDomainScanWithProjectId).mockResolvedValue({
            result: { pages: [] },
            projectId: 'proj-9',
        } as any);
        const req = new Request('http://localhost/api/scan/domain/d1/summary?seoFull=1');
        const res = await GET(req, { params: Promise.resolve({ id: 'd1' }) });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.projectId).toBe('proj-9');
        expect(body.summaryMeta).toEqual({ seoPageRowsOmitted: false });
        expect(body.aggregated?.seo?.pages).toHaveLength(1);
        expect(body.pages).toBeUndefined();
        expect(body.graph).toBeUndefined();
    });
});
