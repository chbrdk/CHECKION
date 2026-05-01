/**
 * PATCH /api/projects/[id] — when `tags` change, sync domain + standalone scan rows.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/cache', () => ({
    invalidateDomainList: vi.fn(),
    invalidateScansList: vi.fn(),
}));
vi.mock('@/lib/db/sync-domain-scan-tags-from-projects', () => ({
    syncDomainScanTagsForProjectId: vi.fn(),
}));
vi.mock('@/lib/db/sync-standalone-scan-tags-from-projects', () => ({
    syncStandaloneScansTagsForProjectId: vi.fn(),
}));
vi.mock('@/lib/auth-api-token', () => ({ getRequestUser: vi.fn() }));
vi.mock('@/lib/db/projects', () => ({
    getProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
}));

import { PATCH } from '@/app/api/projects/[id]/route';
import { invalidateDomainList, invalidateScansList } from '@/lib/cache';
import { syncDomainScanTagsForProjectId } from '@/lib/db/sync-domain-scan-tags-from-projects';
import { syncStandaloneScansTagsForProjectId } from '@/lib/db/sync-standalone-scan-tags-from-projects';
import { getProject, updateProject } from '@/lib/db/projects';
import { getRequestUser } from '@/lib/auth-api-token';

describe('PATCH /api/projects/[id] — tag sync', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' } as any);
        vi.mocked(getProject).mockResolvedValue({ id: 'p1' } as any);
        vi.mocked(updateProject).mockResolvedValue(true);
        vi.mocked(syncDomainScanTagsForProjectId).mockReset();
        vi.mocked(syncStandaloneScansTagsForProjectId).mockReset();
        vi.mocked(invalidateDomainList).mockReset();
        vi.mocked(invalidateScansList).mockReset();
    });

    it('syncs domain and standalone scan tags when project tags are updated', async () => {
        const req = new NextRequest('http://localhost/api/projects/p1', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags: ['a', 'b'] }),
        });
        const res = await PATCH(req, { params: Promise.resolve({ id: 'p1' }) });
        expect(res.status).toBe(200);
        expect(syncDomainScanTagsForProjectId).toHaveBeenCalledWith('p1');
        expect(syncStandaloneScansTagsForProjectId).toHaveBeenCalledWith('p1');
        expect(invalidateScansList).toHaveBeenCalledWith('u1');
        expect(invalidateDomainList).toHaveBeenCalledWith('u1');
    });

    it('does not call scan tag sync when tags field omitted', async () => {
        const req = new NextRequest('http://localhost/api/projects/p1', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Renamed' }),
        });
        await PATCH(req, { params: Promise.resolve({ id: 'p1' }) });
        expect(syncDomainScanTagsForProjectId).not.toHaveBeenCalled();
        expect(syncStandaloneScansTagsForProjectId).not.toHaveBeenCalled();
        expect(invalidateScansList).not.toHaveBeenCalled();
        expect(invalidateDomainList).toHaveBeenCalledWith('u1');
    });
});
