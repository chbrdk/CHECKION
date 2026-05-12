import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));

vi.mock('@/lib/cache', () => ({
    listCachedStandaloneScanSummaries: vi.fn(),
    getCachedStandaloneScansCount: vi.fn(),
    invalidateScansList: vi.fn(),
}));

vi.mock('@/lib/db/scans', () => ({
    insertScanSession: vi.fn(),
    getSharedProjectStandaloneScansCount: vi.fn(),
    listSharedProjectStandaloneScanSummaries: vi.fn(),
    persistStandaloneScanRow: vi.fn(),
    listScansByGroupId: vi.fn(),
}));

vi.mock('@/lib/db/projects', () => ({
    getProject: vi.fn(),
    listProjects: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
    checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/standalone-scan-reuse', () => ({
    tryReuseStandaloneScan: vi.fn(),
}));

import { GET } from '@/app/api/scan/route';
import { getRequestUser } from '@/lib/auth-api-token';
import { getCachedStandaloneScansCount, listCachedStandaloneScanSummaries } from '@/lib/cache';
import {
    getSharedProjectStandaloneScansCount,
    listScansByGroupId,
    listSharedProjectStandaloneScanSummaries,
} from '@/lib/db/scans';
import { getProject, listProjects } from '@/lib/db/projects';

describe('GET /api/scan shared-project lists', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'viewer-1' } as never);
        vi.mocked(listProjects).mockResolvedValue([]);
        vi.mocked(listCachedStandaloneScanSummaries).mockResolvedValue([]);
        vi.mocked(getCachedStandaloneScansCount).mockResolvedValue(0);
        vi.mocked(listSharedProjectStandaloneScanSummaries).mockResolvedValue([]);
        vi.mocked(getSharedProjectStandaloneScansCount).mockResolvedValue(0);
        vi.mocked(listScansByGroupId).mockResolvedValue([]);
        vi.mocked(getProject).mockReset();
    });

    it('merges shared project standalone scans when projectId is absent', async () => {
        vi.mocked(listProjects).mockResolvedValue([
            { id: '11111111-1111-4111-8111-111111111111', userId: 'owner-1' },
        ] as never);
        vi.mocked(listCachedStandaloneScanSummaries).mockResolvedValue([
            {
                id: 'scan-own',
                url: 'https://own.example',
                timestamp: '2026-05-12T20:00:00.000Z',
                score: 80,
                stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
                projectId: null,
                groupId: null,
                scanSessionId: null,
                device: 'desktop',
                tags: [],
                projectTags: [],
                industry: null,
                targetRegion: null,
            },
        ] as never);
        vi.mocked(getCachedStandaloneScansCount).mockResolvedValue(1 as never);
        vi.mocked(listSharedProjectStandaloneScanSummaries).mockResolvedValue([
            {
                id: 'scan-shared',
                url: 'https://shared.example',
                timestamp: '2026-05-12T21:00:00.000Z',
                score: 91,
                stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
                projectId: '11111111-1111-4111-8111-111111111111',
                groupId: null,
                scanSessionId: null,
                device: 'desktop',
                tags: [],
                projectTags: [],
                industry: null,
                targetRegion: null,
            },
        ] as never);
        vi.mocked(getSharedProjectStandaloneScansCount).mockResolvedValue(1 as never);

        const req = new NextRequest('http://localhost/api/scan?limit=10&page=1');
        const res = await GET(req);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.map((item: { id: string }) => item.id)).toEqual(['scan-shared', 'scan-own']);
        expect(body.pagination.total).toBe(2);
        expect(listSharedProjectStandaloneScanSummaries).toHaveBeenCalledWith(
            ['11111111-1111-4111-8111-111111111111'],
            expect.objectContaining({ limit: 10, offset: 0 })
        );
    });

    it('uses the project owner user id for shared project filters', async () => {
        vi.mocked(getProject).mockResolvedValue({
            id: '11111111-1111-4111-8111-111111111111',
            userId: 'owner-1',
        } as never);

        const req = new NextRequest(
            'http://localhost/api/scan?projectId=11111111-1111-4111-8111-111111111111&limit=10&page=1'
        );
        const res = await GET(req);

        expect(res.status).toBe(200);
        expect(listCachedStandaloneScanSummaries).toHaveBeenCalledWith(
            'owner-1',
            expect.objectContaining({ projectId: '11111111-1111-4111-8111-111111111111' })
        );
        expect(getCachedStandaloneScansCount).toHaveBeenCalledWith(
            'owner-1',
            expect.objectContaining({ projectId: '11111111-1111-4111-8111-111111111111' })
        );
    });
});
