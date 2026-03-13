/**
 * API tests: GET /api/rank-tracking/keywords
 * Run: npm run test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/rank-tracking/keywords/route';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));
vi.mock('@/lib/db/projects', () => ({
    getProject: vi.fn(),
}));
vi.mock('@/lib/db/rank-tracking-keywords', () => ({
    listKeywordsByProject: vi.fn(),
}));
vi.mock('@/lib/db/rank-tracking-positions', () => ({
    getLastPositionsByKeywordIds: vi.fn(),
}));

import { getRequestUser } from '@/lib/auth-api-token';
import { getProject } from '@/lib/db/projects';
import { listKeywordsByProject } from '@/lib/db/rank-tracking-keywords';
import { getLastPositionsByKeywordIds } from '@/lib/db/rank-tracking-positions';

describe('GET /api/rank-tracking/keywords', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(getProject).mockReset();
        vi.mocked(listKeywordsByProject).mockReset();
        vi.mocked(getLastPositionsByKeywordIds).mockReset();
    });

    it('returns 401 when unauthenticated', async () => {
        vi.mocked(getRequestUser).mockResolvedValue(null);
        const req = new NextRequest('http://localhost/api/rank-tracking/keywords?projectId=pid-1');
        const res = await GET(req);
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toBe('Unauthorized');
    });

    it('returns 400 when projectId is missing', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        const req = new NextRequest('http://localhost/api/rank-tracking/keywords');
        const res = await GET(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain('projectId');
    });

    it('returns 404 when project not found', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        vi.mocked(getProject).mockResolvedValue(null);
        const req = new NextRequest('http://localhost/api/rank-tracking/keywords?projectId=pid-1');
        const res = await GET(req);
        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json.error).toBe('Project not found');
    });

    it('returns 200 with empty data when project has no keywords', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        vi.mocked(getProject).mockResolvedValue({ id: 'pid-1', userId: 'user-1', name: 'P', domain: null, createdAt: new Date(), updatedAt: new Date() } as never);
        vi.mocked(listKeywordsByProject).mockResolvedValue([]);
        vi.mocked(getLastPositionsByKeywordIds).mockResolvedValue(new Map());
        const req = new NextRequest('http://localhost/api/rank-tracking/keywords?projectId=pid-1');
        const res = await GET(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(Array.isArray(json.data)).toBe(true);
        expect(json.data).toHaveLength(0);
    });

    it('returns 200 with keywords and last position when present', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        vi.mocked(getProject).mockResolvedValue({ id: 'pid-1', userId: 'user-1', name: 'P', domain: null, createdAt: new Date(), updatedAt: new Date() } as never);
        vi.mocked(listKeywordsByProject).mockResolvedValue([
            {
                id: 'kw-1',
                userId: 'user-1',
                projectId: 'pid-1',
                domain: 'example.com',
                keyword: 'test',
                country: 'de',
                language: 'de',
                device: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ] as never[]);
        const lastMap = new Map<string, { position: number | null; recordedAt: Date }>();
        lastMap.set('kw-1', { position: 3, recordedAt: new Date('2025-01-15') });
        vi.mocked(getLastPositionsByKeywordIds).mockResolvedValue(lastMap);
        const req = new NextRequest('http://localhost/api/rank-tracking/keywords?projectId=pid-1');
        const res = await GET(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data).toHaveLength(1);
        expect(json.data[0]).toMatchObject({
            id: 'kw-1',
            domain: 'example.com',
            keyword: 'test',
            country: 'de',
            lastPosition: 3,
        });
        expect(json.data[0].lastRecordedAt).toBeDefined();
    });
});
