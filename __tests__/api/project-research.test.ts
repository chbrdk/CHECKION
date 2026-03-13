/**
 * API tests: POST /api/projects/[id]/research
 * Run: npm run test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { projectResearchResultSchema } from '@/lib/research/schema';

const mockChatCompletionsParse = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));
vi.mock('@/lib/db/projects', () => ({
    getProject: vi.fn(),
}));
vi.mock('@/lib/llm/config', () => ({
    getOpenAIKey: () => 'sk-test',
}));
vi.mock('@/lib/usage-report', () => ({
    reportUsage: vi.fn(),
}));
vi.mock('openai', () => ({
    default: function OpenAI() {
        return {
            chat: {
                completions: {
                    parse: mockChatCompletionsParse,
                },
            },
        };
    },
}));
vi.mock('openai/helpers/zod', () => ({
    zodResponseFormat: vi.fn(() => ({ type: 'json_schema', name: 'project_research' })),
}));

import { POST } from '@/app/api/projects/[id]/research/route';
import { getRequestUser } from '@/lib/auth-api-token';
import { getProject } from '@/lib/db/projects';

const validResearchResult = {
    targetGroups: ['B2B decision-makers', 'SMBs in tech'],
    valueProposition: 'We help companies scale.',
    seoKeywords: ['seo tool', 'rank tracking', 'keyword research'],
    geoQueries: ['best SEO tool 2024', 'top rank tracking software'],
    competitors: ['competitor1.com', 'competitor2.com'],
};

describe('POST /api/projects/[id]/research', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(getProject).mockReset();
        mockChatCompletionsParse.mockReset();
    });

    it('returns 401 when unauthenticated', async () => {
        vi.mocked(getRequestUser).mockResolvedValue(null);
        const req = new NextRequest('http://localhost/api/projects/proj-1/research', { method: 'POST' });
        const res = await POST(req, { params: Promise.resolve({ id: 'proj-1' }) });
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toBe('Unauthorized');
    });

    it('returns 404 when project not found', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        vi.mocked(getProject).mockResolvedValue(null);
        const req = new NextRequest('http://localhost/api/projects/proj-1/research', { method: 'POST' });
        const res = await POST(req, { params: Promise.resolve({ id: 'proj-1' }) });
        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json.error).toBe('Project not found');
    });

    it('returns 400 when project has no domain', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        vi.mocked(getProject).mockResolvedValue({
            id: 'proj-1',
            userId: 'user-1',
            name: 'Test',
            domain: null,
            competitors: [],
            geoQueries: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        } as never);
        const req = new NextRequest('http://localhost/api/projects/proj-1/research', { method: 'POST' });
        const res = await POST(req, { params: Promise.resolve({ id: 'proj-1' }) });
        expect(res.status).toBe(400);
    });

    it('returns 200 with research result when parse returns valid data', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        vi.mocked(getProject).mockResolvedValue({
            id: 'proj-1',
            userId: 'user-1',
            name: 'Test',
            domain: 'https://example.com',
            competitors: [],
            geoQueries: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        } as never);
        mockChatCompletionsParse.mockResolvedValue({
            choices: [
                {
                    message: {
                        parsed: validResearchResult,
                    },
                },
            ],
            usage: { prompt_tokens: 100, completion_tokens: 50 },
        });
        const req = new NextRequest('http://localhost/api/projects/proj-1/research', {
            method: 'POST',
            body: JSON.stringify({}),
        });
        const res = await POST(req, { params: Promise.resolve({ id: 'proj-1' }) });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(projectResearchResultSchema.safeParse(json).success).toBe(true);
        expect(json.targetGroups).toEqual(validResearchResult.targetGroups);
        expect(json.seoKeywords).toEqual(validResearchResult.seoKeywords);
        expect(json.competitors).toEqual(validResearchResult.competitors);
    });
});
