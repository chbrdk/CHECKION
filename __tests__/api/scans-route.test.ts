import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));

vi.mock('@/lib/db/projects', () => ({
    listProjects: vi.fn(),
}));

vi.mock('@/lib/db/scans', () => ({
    listStandaloneScansFull: vi.fn(),
    listSharedProjectStandaloneScansFull: vi.fn(),
}));

import { GET } from '@/app/api/scans/route';
import { getRequestUser } from '@/lib/auth-api-token';
import { listProjects } from '@/lib/db/projects';
import { listSharedProjectStandaloneScansFull, listStandaloneScansFull } from '@/lib/db/scans';

describe('GET /api/scans', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(listProjects).mockResolvedValue([]);
        vi.mocked(listStandaloneScansFull).mockResolvedValue([]);
        vi.mocked(listSharedProjectStandaloneScansFull).mockResolvedValue([]);
    });

    it('returns 401 when unauthenticated', async () => {
        vi.mocked(getRequestUser).mockResolvedValue(null as never);

        const res = await GET(new Request('http://localhost/api/scans'));

        expect(res.status).toBe(401);
    });

    it('merges viewer and shared-project standalone scans', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'viewer-1' } as never);
        vi.mocked(listProjects).mockResolvedValue([
            { id: '11111111-1111-4111-8111-111111111111', userId: 'owner-1' },
        ] as never);
        vi.mocked(listStandaloneScansFull).mockResolvedValue([
            {
                id: 'scan-own',
                timestamp: '2026-05-12T20:00:00.000Z',
                url: 'https://own.example',
            },
        ] as never);
        vi.mocked(listSharedProjectStandaloneScansFull).mockResolvedValue([
            {
                id: 'scan-shared',
                timestamp: '2026-05-12T21:00:00.000Z',
                url: 'https://shared.example',
            },
        ] as never);

        const res = await GET(new Request('http://localhost/api/scans'));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.count).toBe(2);
        expect(body.data.map((item: { id: string }) => item.id)).toEqual(['scan-shared', 'scan-own']);
        expect(listStandaloneScansFull).toHaveBeenCalledWith('viewer-1');
        expect(listSharedProjectStandaloneScansFull).toHaveBeenCalledWith([
            '11111111-1111-4111-8111-111111111111',
        ]);
    });
});
