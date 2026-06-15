import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));
vi.mock('@/lib/db/projects', () => ({
    getProject: vi.fn(),
}));
vi.mock('@/lib/project-competitor-changes', () => ({
    buildProjectCompetitorChanges: vi.fn(),
}));

import { getRequestUser } from '@/lib/auth-api-token';
import { getProject } from '@/lib/db/projects';
import { buildProjectCompetitorChanges } from '@/lib/project-competitor-changes';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/projects/[id]/competitor-changes/route';

describe('GET /api/projects/[id]/competitor-changes', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(getProject).mockReset();
        vi.mocked(buildProjectCompetitorChanges).mockReset();
    });

    it('returns 401 when unauthenticated', async () => {
        vi.mocked(getRequestUser).mockResolvedValue(null);
        const res = await GET(
            new NextRequest('http://localhost/api/projects/p1/competitor-changes'),
            { params: Promise.resolve({ id: 'p1' }) },
        );
        expect(res.status).toBe(401);
    });

    it('returns competitor change diffs for project', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1', email: 'a@b.c' } as never);
        vi.mocked(getProject).mockResolvedValue({ id: 'p1', userId: 'u1' } as never);
        vi.mocked(buildProjectCompetitorChanges).mockResolvedValue({
            own: null,
            competitors: {
                'rival.com': {
                    currentScanId: 's2',
                    previousScanId: 's1',
                    lineageKey: 'k',
                    currentVersion: 2,
                    comparedAt: '2024-01-02T00:00:00Z',
                    summary: {
                        newCount: 1,
                        removedCount: 0,
                        unchangedCount: 5,
                        likelyUpdatedCount: 0,
                        totalCurrent: 6,
                        totalPrevious: 5,
                    },
                    pages: [],
                },
            },
        });

        const res = await GET(
            new NextRequest('http://localhost/api/projects/p1/competitor-changes'),
            { params: Promise.resolve({ id: 'p1' }) },
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.competitors['rival.com']?.summary.newCount).toBe(1);
    });
});
