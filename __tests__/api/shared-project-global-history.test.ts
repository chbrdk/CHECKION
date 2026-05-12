import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));

vi.mock('@/lib/db/projects', () => ({
    getProject: vi.fn(),
    listProjects: vi.fn(),
}));

vi.mock('@/lib/db/geo-eeat-runs', () => ({
    listGeoEeatRuns: vi.fn(),
    listSharedProjectGeoEeatRuns: vi.fn(),
}));

vi.mock('@/lib/db/journey-runs', () => ({
    listJourneyRuns: vi.fn(),
    listSharedProjectJourneyRuns: vi.fn(),
}));

vi.mock('@/lib/ux-journey-agent-enabled', () => ({
    uxJourneyAgentEnabled: vi.fn(),
}));

import { GET as GET_GEO_HISTORY } from '@/app/api/scan/geo-eeat/history/route';
import { GET as GET_JOURNEY_HISTORY } from '@/app/api/scan/journey-agent/history/route';
import { getRequestUser } from '@/lib/auth-api-token';
import { listSharedProjectGeoEeatRuns, listGeoEeatRuns } from '@/lib/db/geo-eeat-runs';
import { listSharedProjectJourneyRuns, listJourneyRuns } from '@/lib/db/journey-runs';
import { listProjects } from '@/lib/db/projects';
import { uxJourneyAgentEnabled } from '@/lib/ux-journey-agent-enabled';

describe('shared-project global history routes', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'viewer-1' } as never);
        vi.mocked(listProjects).mockResolvedValue([
            { id: '11111111-1111-4111-8111-111111111111', userId: 'owner-1' },
        ] as never);
        vi.mocked(listGeoEeatRuns).mockResolvedValue([]);
        vi.mocked(listSharedProjectGeoEeatRuns).mockResolvedValue([]);
        vi.mocked(listJourneyRuns).mockResolvedValue([]);
        vi.mocked(listSharedProjectJourneyRuns).mockResolvedValue([]);
        vi.mocked(uxJourneyAgentEnabled).mockReturnValue(true);
    });

    it('GET /api/scan/geo-eeat/history merges shared project runs when projectId is absent', async () => {
        vi.mocked(listGeoEeatRuns).mockResolvedValue([
            {
                id: 'geo-own',
                createdAt: new Date('2026-05-12T20:00:00.000Z'),
            },
        ] as never);
        vi.mocked(listSharedProjectGeoEeatRuns).mockResolvedValue([
            {
                id: 'geo-shared',
                createdAt: new Date('2026-05-12T21:00:00.000Z'),
                projectId: '11111111-1111-4111-8111-111111111111',
                userId: 'owner-1',
            },
        ] as never);

        const req = new NextRequest('http://localhost/api/scan/geo-eeat/history?limit=10');
        const res = await GET_GEO_HISTORY(req);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.runs.map((item: { id: string }) => item.id)).toEqual(['geo-shared', 'geo-own']);
        expect(listGeoEeatRuns).toHaveBeenCalledWith('viewer-1', 10);
        expect(listSharedProjectGeoEeatRuns).toHaveBeenCalledWith(
            ['11111111-1111-4111-8111-111111111111'],
            10
        );
    });

    it('GET /api/scan/journey-agent/history merges shared project runs when projectId is absent', async () => {
        vi.mocked(listJourneyRuns).mockResolvedValue([
            {
                id: 'journey-own',
                createdAt: new Date('2026-05-12T20:00:00.000Z'),
            },
        ] as never);
        vi.mocked(listSharedProjectJourneyRuns).mockResolvedValue([
            {
                id: 'journey-shared',
                createdAt: new Date('2026-05-12T21:00:00.000Z'),
                projectId: '11111111-1111-4111-8111-111111111111',
                userId: 'owner-1',
            },
        ] as never);

        const req = new NextRequest('http://localhost/api/scan/journey-agent/history?limit=10');
        const res = await GET_JOURNEY_HISTORY(req);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.runs.map((item: { id: string }) => item.id)).toEqual(['journey-shared', 'journey-own']);
        expect(listJourneyRuns).toHaveBeenCalledWith('viewer-1', 10);
        expect(listSharedProjectJourneyRuns).toHaveBeenCalledWith(
            ['11111111-1111-4111-8111-111111111111'],
            10
        );
    });
});
