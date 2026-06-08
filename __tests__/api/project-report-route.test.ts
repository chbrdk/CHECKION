/**
 * API tests for project report routes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));

vi.mock('@/lib/db/projects', () => ({
    getProject: vi.fn(),
}));

vi.mock('@/lib/db/project-report-runs', () => ({
    insertProjectReportRun: vi.fn(),
    getProjectReportRun: vi.fn(),
    listProjectReportRuns: vi.fn(),
}));

vi.mock('@/lib/project-report/run-job', () => ({
    runProjectReportJob: vi.fn(),
}));

import { getRequestUser } from '@/lib/auth-api-token';
import { getProject } from '@/lib/db/projects';
import { insertProjectReportRun, getProjectReportRun, listProjectReportRuns } from '@/lib/db/project-report-runs';
import { runProjectReportJob } from '@/lib/project-report/run-job';
import { POST, GET as GET_LIST } from '@/app/api/projects/[id]/report/route';
import { GET as GET_RUN } from '@/app/api/projects/[id]/report/[runId]/route';

describe('POST /api/projects/[id]/report', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'viewer-1', email: 'a@b.c' } as Awaited<
            ReturnType<typeof getRequestUser>
        >);
        vi.mocked(getProject).mockResolvedValue({
            id: 'proj-1',
            userId: 'owner-1',
            name: 'P',
        } as Awaited<ReturnType<typeof getProject>>);
        vi.mocked(insertProjectReportRun).mockResolvedValue(undefined);
        vi.mocked(runProjectReportJob).mockImplementation(() => undefined);
    });

    it('returns 401 without auth', async () => {
        vi.mocked(getRequestUser).mockResolvedValue(null);
        const req = new NextRequest('http://localhost/api/projects/proj-1/report', { method: 'POST' });
        const res = await POST(req, { params: Promise.resolve({ id: 'proj-1' }) });
        expect(res.status).toBe(401);
    });

    it('starts report job and returns runId', async () => {
        const req = new NextRequest('http://localhost/api/projects/proj-1/report', {
            method: 'POST',
            body: JSON.stringify({ locale: 'de' }),
        });
        const res = await POST(req, { params: Promise.resolve({ id: 'proj-1' }) });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.runId).toBeTruthy();
        expect(vi.mocked(insertProjectReportRun)).toHaveBeenCalled();
        expect(vi.mocked(runProjectReportJob)).toHaveBeenCalled();
    });
});

describe('GET /api/projects/[id]/report/[runId]', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'viewer-1' } as Awaited<
            ReturnType<typeof getRequestUser>
        >);
        vi.mocked(getProject).mockResolvedValue({
            id: 'proj-1',
            userId: 'owner-1',
        } as Awaited<ReturnType<typeof getProject>>);
    });

    it('returns bundle when complete', async () => {
        vi.mocked(getProjectReportRun).mockResolvedValue({
            id: 'run-1',
            userId: 'owner-1',
            projectId: 'proj-1',
            status: 'complete',
            locale: 'de',
            variant: 'executive',
            bundle: { version: '1.0', project: { name: 'P' } } as never,
            error: null,
            createdAt: new Date(),
            completedAt: new Date(),
        });

        const req = new NextRequest('http://localhost/api/projects/proj-1/report/run-1');
        const res = await GET_RUN(req, { params: Promise.resolve({ id: 'proj-1', runId: 'run-1' }) });
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.status).toBe('complete');
        expect(json.data.bundle).toBeTruthy();
    });
});

describe('GET /api/projects/[id]/report list', () => {
    it('lists recent runs', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'viewer-1' } as Awaited<
            ReturnType<typeof getRequestUser>
        >);
        vi.mocked(getProject).mockResolvedValue({ id: 'proj-1', userId: 'owner-1' } as Awaited<
            ReturnType<typeof getProject>
        >);
        vi.mocked(listProjectReportRuns).mockResolvedValue([
            {
                id: 'run-1',
                userId: 'owner-1',
                projectId: 'proj-1',
                status: 'complete',
                locale: 'de',
                variant: 'executive',
                bundle: null,
                error: null,
                createdAt: new Date(),
                completedAt: new Date(),
            },
        ]);

        const req = new NextRequest('http://localhost/api/projects/proj-1/report');
        const res = await GET_LIST(req, { params: Promise.resolve({ id: 'proj-1' }) });
        const json = await res.json();
        expect(json.data).toHaveLength(1);
    });
});
