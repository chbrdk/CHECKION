/**
 * API tests: GET /api/projects/[id]/ranking-summary
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-api-token', () => ({ getRequestUser: vi.fn() }));
vi.mock('@/lib/db/projects', () => ({ getProject: vi.fn() }));
vi.mock('@/lib/db/rank-tracking-keywords', () => ({ listKeywordsByProject: vi.fn() }));
vi.mock('@/lib/db/rank-tracking-positions', () => ({ getLastPositionsByKeywordIds: vi.fn() }));

import { GET } from '@/app/api/projects/[id]/ranking-summary/route';
import { getRequestUser } from '@/lib/auth-api-token';
import { getProject } from '@/lib/db/projects';
import { listKeywordsByProject } from '@/lib/db/rank-tracking-keywords';
import { getLastPositionsByKeywordIds } from '@/lib/db/rank-tracking-positions';

describe('GET /api/projects/[id]/ranking-summary', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(getProject).mockReset();
        vi.mocked(listKeywordsByProject).mockReset();
        vi.mocked(getLastPositionsByKeywordIds).mockReset();
    });

    it('returns 401 when unauthenticated', async () => {
        vi.mocked(getRequestUser).mockResolvedValue(null);
        const req = new NextRequest('http://localhost/api/projects/proj-1/ranking-summary');
        const res = await GET(req, { params: Promise.resolve({ id: 'proj-1' }) });
        expect(res.status).toBe(401);
    });

    it('returns 404 when project not found', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        vi.mocked(getProject).mockResolvedValue(null);
        const req = new NextRequest('http://localhost/api/projects/proj-1/ranking-summary');
        const res = await GET(req, { params: Promise.resolve({ id: 'proj-1' }) });
        expect(res.status).toBe(404);
    });

    it('returns score null and keywordCount 0 when no keywords', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        vi.mocked(getProject).mockResolvedValue({ id: 'proj-1', userId: 'user-1' } as never);
        vi.mocked(listKeywordsByProject).mockResolvedValue([]);
        const req = new NextRequest('http://localhost/api/projects/proj-1/ranking-summary');
        const res = await GET(req, { params: Promise.resolve({ id: 'proj-1' }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.data.score).toBeNull();
        expect(data.data.keywordCount).toBe(0);
        expect(data.data.lastUpdated).toBeNull();
    });

    it('returns computed score when keywords have positions', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        vi.mocked(getProject).mockResolvedValue({ id: 'proj-1', userId: 'user-1' } as never);
        vi.mocked(listKeywordsByProject).mockResolvedValue([{ id: 'kw-1' }, { id: 'kw-2' }] as never);
        vi.mocked(getLastPositionsByKeywordIds).mockResolvedValue(
            new Map([
                ['kw-1', { position: 1, recordedAt: new Date('2025-01-01') }],
                ['kw-2', { position: 5, recordedAt: new Date('2025-01-02') }],
            ])
        );
        const req = new NextRequest('http://localhost/api/projects/proj-1/ranking-summary');
        const res = await GET(req, { params: Promise.resolve({ id: 'proj-1' }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.data.keywordCount).toBe(2);
        expect(data.data.score).toBe(80); // (100 + 60) / 2 = 80
        expect(data.data.lastUpdated).toBeTruthy();
    });
});
