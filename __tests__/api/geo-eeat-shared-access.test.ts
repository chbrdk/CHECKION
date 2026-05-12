import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));
vi.mock('@/lib/db/geo-eeat-runs', () => ({
    getGeoEeatRun: vi.fn(),
    resolveGeoEeatRunProjectAssignmentContext: vi.fn(),
    updateGeoEeatRun: vi.fn(),
}));

import { getRequestUser } from '@/lib/auth-api-token';
import {
    getGeoEeatRun,
    resolveGeoEeatRunProjectAssignmentContext,
} from '@/lib/db/geo-eeat-runs';

describe('shared GEO/E-E-A-T run access', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'viewer-1' } as any);
        vi.mocked(resolveGeoEeatRunProjectAssignmentContext).mockResolvedValue({
            resourceUserId: 'owner-1',
            currentProjectId: '11111111-1111-4111-8111-111111111111',
        });
        vi.mocked(getGeoEeatRun).mockResolvedValue({
            id: 'job-1',
            userId: 'owner-1',
            projectId: '11111111-1111-4111-8111-111111111111',
            url: 'https://example.com',
            status: 'complete',
            payload: { pages: [], recommendations: [] },
            error: null,
            createdAt: new Date('2026-05-12T20:00:00.000Z'),
            updatedAt: new Date('2026-05-12T20:01:00.000Z'),
        } as any);
    });

    it('reads shared project geo runs through the owner user id', async () => {
        const { GET } = await import('@/app/api/scan/geo-eeat/[jobId]/route');
        const req = new NextRequest('http://localhost/api/scan/geo-eeat/job-1');

        const res = await GET(req, { params: Promise.resolve({ jobId: 'job-1' }) });

        expect(res.status).toBe(200);
        expect(resolveGeoEeatRunProjectAssignmentContext).toHaveBeenCalledWith('job-1', 'viewer-1');
        expect(getGeoEeatRun).toHaveBeenCalledWith('job-1', 'owner-1');
    });
});
