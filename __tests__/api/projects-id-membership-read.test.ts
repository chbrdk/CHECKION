import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-api-token', () => ({ getRequestUser: vi.fn() }));
vi.mock('@/lib/db/projects', () => ({
    getProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
}));
vi.mock('@/lib/db/scans', () => ({
    getDomainScansCount: vi.fn(),
    getStandaloneScansCount: vi.fn(),
}));
vi.mock('@/lib/db/journey-runs', () => ({
    listJourneyRuns: vi.fn(),
}));
vi.mock('@/lib/db/geo-eeat-runs', () => ({
    listGeoEeatRuns: vi.fn(),
}));
vi.mock('@/lib/db/rank-tracking-keywords', () => ({
    getKeywordsCountByProject: vi.fn(),
}));

import { GET } from '@/app/api/projects/[id]/route';
import { getRequestUser } from '@/lib/auth-api-token';
import { getProject } from '@/lib/db/projects';
import { getDomainScansCount, getStandaloneScansCount } from '@/lib/db/scans';
import { listJourneyRuns } from '@/lib/db/journey-runs';
import { listGeoEeatRuns } from '@/lib/db/geo-eeat-runs';
import { getKeywordsCountByProject } from '@/lib/db/rank-tracking-keywords';

describe('GET /api/projects/[id] membership reads', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'viewer-1' } as any);
        vi.mocked(getProject).mockResolvedValue({
            id: 'p1',
            userId: 'owner-1',
            name: 'Shared Project',
        } as any);
        vi.mocked(getDomainScansCount).mockResolvedValue(3);
        vi.mocked(getStandaloneScansCount).mockResolvedValue(4);
        vi.mocked(listJourneyRuns).mockResolvedValue([{ id: 'j1' }] as any);
        vi.mocked(listGeoEeatRuns).mockResolvedValue([{ id: 'g1' }, { id: 'g2' }] as any);
        vi.mocked(getKeywordsCountByProject).mockResolvedValue(5);
    });

    it('loads project aggregates with the owner user id after membership access', async () => {
        const req = new NextRequest('http://localhost/api/projects/p1');
        const res = await GET(req, { params: Promise.resolve({ id: 'p1' }) });
        expect(res.status).toBe(200);
        expect(getDomainScansCount).toHaveBeenCalledWith('owner-1', { projectId: 'p1' });
        expect(listJourneyRuns).toHaveBeenCalledWith('owner-1', 10000, { projectId: 'p1' });
        expect(listGeoEeatRuns).toHaveBeenCalledWith('owner-1', 10000, { projectId: 'p1' });
        expect(getStandaloneScansCount).toHaveBeenCalledWith('owner-1', { projectId: 'p1' });
    });
});
