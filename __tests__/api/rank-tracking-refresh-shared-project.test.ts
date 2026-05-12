import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));
vi.mock('@/lib/db/projects', () => ({
    getProject: vi.fn(),
}));
vi.mock('@/lib/db/rank-tracking-keywords', () => ({
    getKeyword: vi.fn(),
    getKeywordById: vi.fn(),
    listKeywordIdsByProject: vi.fn(),
    touchKeywordUpdatedAt: vi.fn(),
}));
vi.mock('@/lib/db/rank-tracking-positions', () => ({
    insertPosition: vi.fn(),
}));
vi.mock('@/lib/serp-api', () => ({
    fetchSerpPosition: vi.fn(),
}));
vi.mock('@/lib/usage-report', () => ({
    reportUsage: vi.fn(),
}));

import { getRequestUser } from '@/lib/auth-api-token';
import { getProject } from '@/lib/db/projects';
import {
    getKeyword,
    getKeywordById,
    touchKeywordUpdatedAt,
} from '@/lib/db/rank-tracking-keywords';
import { fetchSerpPosition } from '@/lib/serp-api';

describe('POST /api/rank-tracking/refresh shared project access', () => {
    const sharedProjectId = '11111111-1111-4111-8111-111111111111';
    const sharedKeywordId = '22222222-2222-4222-8222-222222222222';

    beforeEach(() => {
        vi.resetAllMocks();
        process.env.SERP_API_KEY = 'test-key';
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'viewer-1' } as any);
        const sharedKeyword = {
            id: sharedKeywordId,
            userId: 'owner-1',
            projectId: sharedProjectId,
            domain: 'example.com',
            keyword: 'barrierefreiheit test',
            country: 'de',
            language: 'de',
            device: 'desktop',
        } as any;
        vi.mocked(getKeyword)
            .mockResolvedValueOnce(null as any)
            .mockResolvedValueOnce(sharedKeyword);
        vi.mocked(getKeywordById).mockResolvedValue(sharedKeyword);
        vi.mocked(getProject).mockResolvedValue({
            id: sharedProjectId,
            userId: 'owner-1',
            competitors: ['competitor.example'],
        } as any);
        vi.mocked(fetchSerpPosition).mockResolvedValue({
            position: 3,
            competitorPositions: { 'competitor.example': 5 },
        } as any);
    });

    it('refreshes shared-project keywords with the owner user id', async () => {
        const { POST } = await import('@/app/api/rank-tracking/refresh/route');
        const req = new NextRequest('http://localhost/api/rank-tracking/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keywordId: sharedKeywordId }),
        });

        const res = await POST(req);

        expect(res.status).toBe(200);
        expect(getKeyword).toHaveBeenCalledWith(sharedKeywordId, 'viewer-1');
        expect(getKeywordById).toHaveBeenCalledWith(sharedKeywordId);
        expect(getKeyword).toHaveBeenLastCalledWith(sharedKeywordId, 'owner-1');
        expect(touchKeywordUpdatedAt).toHaveBeenCalledWith(sharedKeywordId, 'owner-1');
    });
});
