import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));
vi.mock('@/lib/db/projects', () => ({
    getProject: vi.fn(),
}));
vi.mock('@/lib/db/scans', () => ({
    resolveScanProjectAssignmentContext: vi.fn(),
    updateScanProject: vi.fn(),
}));
vi.mock('@/lib/db/geo-eeat-runs', () => ({
    resolveGeoEeatRunProjectAssignmentContext: vi.fn(),
    updateGeoEeatRunProject: vi.fn(),
}));

import { getRequestUser } from '@/lib/auth-api-token';
import { getProject } from '@/lib/db/projects';
import { resolveScanProjectAssignmentContext, updateScanProject } from '@/lib/db/scans';
import {
    resolveGeoEeatRunProjectAssignmentContext,
    updateGeoEeatRunProject,
} from '@/lib/db/geo-eeat-runs';

describe('shared project detach and rehome routes', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'viewer-1' } as any);
    });

    it('detaches a shared standalone scan using the current resource owner', async () => {
        vi.mocked(resolveScanProjectAssignmentContext).mockResolvedValue({
            resourceUserId: 'owner-1',
            currentProjectId: '11111111-1111-4111-8111-111111111111',
            mode: 'scan',
        });
        vi.mocked(updateScanProject).mockResolvedValue(true);

        const { PATCH } = await import('@/app/api/scan/[id]/project/route');
        const req = new NextRequest('http://localhost/api/scan/scan-1/project', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: null }),
        });

        const res = await PATCH(req, { params: Promise.resolve({ id: 'scan-1' }) });

        expect(res.status).toBe(200);
        expect(resolveScanProjectAssignmentContext).toHaveBeenCalledWith('scan-1', 'viewer-1');
        expect(updateScanProject).toHaveBeenCalledWith('scan-1', 'owner-1', null);
    });

    it('rejects moving a shared standalone scan across different owners', async () => {
        vi.mocked(resolveScanProjectAssignmentContext).mockResolvedValue({
            resourceUserId: 'owner-1',
            currentProjectId: '11111111-1111-4111-8111-111111111111',
            mode: 'scan',
        });
        vi.mocked(getProject).mockResolvedValue({
            id: '33333333-3333-4333-8333-333333333333',
            userId: 'owner-2',
        } as any);

        const { PATCH } = await import('@/app/api/scan/[id]/project/route');
        const req = new NextRequest('http://localhost/api/scan/scan-1/project', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: '33333333-3333-4333-8333-333333333333' }),
        });

        const res = await PATCH(req, { params: Promise.resolve({ id: 'scan-1' }) });

        expect(res.status).toBe(400);
        expect(updateScanProject).not.toHaveBeenCalled();
    });

    it('detaches a shared geo run using the current resource owner', async () => {
        vi.mocked(resolveGeoEeatRunProjectAssignmentContext).mockResolvedValue({
            resourceUserId: 'owner-1',
            currentProjectId: '11111111-1111-4111-8111-111111111111',
        });
        vi.mocked(updateGeoEeatRunProject).mockResolvedValue(true);

        const { PATCH } = await import('@/app/api/scan/geo-eeat/[jobId]/project/route');
        const req = new NextRequest('http://localhost/api/scan/geo-eeat/job-1/project', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: null }),
        });

        const res = await PATCH(req, { params: Promise.resolve({ jobId: 'job-1' }) });

        expect(res.status).toBe(200);
        expect(resolveGeoEeatRunProjectAssignmentContext).toHaveBeenCalledWith('job-1', 'viewer-1');
        expect(updateGeoEeatRunProject).toHaveBeenCalledWith('job-1', 'owner-1', null);
    });
});
