/**
 * API tests: GET /api/projects/[id]/geo-summary
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-api-token', () => ({ getRequestUser: vi.fn() }));
vi.mock('@/lib/db/projects', () => ({ getProject: vi.fn() }));
vi.mock('@/lib/db/geo-eeat-runs', () => ({ listGeoEeatRuns: vi.fn() }));

import { GET } from '@/app/api/projects/[id]/geo-summary/route';
import { getRequestUser } from '@/lib/auth-api-token';
import { getProject } from '@/lib/db/projects';
import { listGeoEeatRuns } from '@/lib/db/geo-eeat-runs';

describe('GET /api/projects/[id]/geo-summary', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(getProject).mockReset();
        vi.mocked(listGeoEeatRuns).mockReset();
    });

    it('returns 401 when unauthenticated', async () => {
        vi.mocked(getRequestUser).mockResolvedValue(null);
        const req = new NextRequest('http://localhost/api/projects/proj-1/geo-summary');
        const res = await GET(req, { params: Promise.resolve({ id: 'proj-1' }) });
        expect(res.status).toBe(401);
    });

    it('returns 404 when project not found', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        vi.mocked(getProject).mockResolvedValue(null);
        const req = new NextRequest('http://localhost/api/projects/proj-1/geo-summary');
        const res = await GET(req, { params: Promise.resolve({ id: 'proj-1' }) });
        expect(res.status).toBe(404);
    });

    it('returns score null and empty runs when no runs', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        vi.mocked(getProject).mockResolvedValue({ id: 'proj-1', userId: 'user-1', domain: 'example.com' } as never);
        vi.mocked(listGeoEeatRuns).mockResolvedValue([]);
        const req = new NextRequest('http://localhost/api/projects/proj-1/geo-summary');
        const res = await GET(req, { params: Promise.resolve({ id: 'proj-1' }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.data.score).toBeNull();
        expect(data.data.runs).toEqual([]);
    });
});
