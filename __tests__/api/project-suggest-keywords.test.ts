/**
 * API tests: POST /api/projects/[id]/suggest-keywords
 * Run: npm run test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockChatCompletionsCreate = vi.hoisted(() => vi.fn());

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
                    create: mockChatCompletionsCreate,
                },
            },
        };
    },
}));

import { POST } from '@/app/api/projects/[id]/suggest-keywords/route';

import { getRequestUser } from '@/lib/auth-api-token';
import { getProject } from '@/lib/db/projects';

describe('POST /api/projects/[id]/suggest-keywords', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(getProject).mockReset();
        mockChatCompletionsCreate.mockReset();
    });

    it('returns 401 when unauthenticated', async () => {
        vi.mocked(getRequestUser).mockResolvedValue(null);
        const req = new NextRequest('http://localhost/api/projects/proj-1/suggest-keywords', { method: 'POST' });
        const res = await POST(req, { params: Promise.resolve({ id: 'proj-1' }) });
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toBe('Unauthorized');
    });

    it('returns 404 when project not found', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        vi.mocked(getProject).mockResolvedValue(null);
        const req = new NextRequest('http://localhost/api/projects/proj-1/suggest-keywords', { method: 'POST' });
        const res = await POST(req, { params: Promise.resolve({ id: 'proj-1' }) });
        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json.error).toBe('Project not found');
    });

    it('returns 200 with keywords when LLM returns valid JSON', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        vi.mocked(getProject).mockResolvedValue({
            id: 'proj-1',
            userId: 'user-1',
            name: 'Test',
            domain: 'example.com',
            competitors: [],
            geoQueries: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        } as never);
        mockChatCompletionsCreate.mockResolvedValue({
            choices: [{ message: { content: '{"keywords":["seo keyword 1","keyword two","long tail query"]}' } }],
            usage: { prompt_tokens: 10, completion_tokens: 5 },
        });
        const req = new NextRequest('http://localhost/api/projects/proj-1/suggest-keywords', { method: 'POST' });
        const res = await POST(req, { params: Promise.resolve({ id: 'proj-1' }) });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.keywords).toEqual(['seo keyword 1', 'keyword two', 'long tail query']);
    });
});
