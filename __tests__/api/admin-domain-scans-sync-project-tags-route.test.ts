/**
 * POST /api/admin/domain-scans/sync-project-tags
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/cache', () => ({ invalidateDomainList: vi.fn() }));
vi.mock('@/lib/db/sync-domain-scan-tags-from-projects', () => ({
    syncDomainScanTagsFromProjects: vi.fn(),
    listDistinctDomainScanUserIds: vi.fn(),
}));

import { POST } from '@/app/api/admin/domain-scans/sync-project-tags/route';
import { invalidateDomainList } from '@/lib/cache';
import {
    syncDomainScanTagsFromProjects,
    listDistinctDomainScanUserIds,
} from '@/lib/db/sync-domain-scan-tags-from-projects';

const ADMIN_KEY = 'a'.repeat(16);

describe('POST /api/admin/domain-scans/sync-project-tags', () => {
    const prevKey = process.env.CHECKION_ADMIN_API_KEY;

    beforeEach(() => {
        process.env.CHECKION_ADMIN_API_KEY = ADMIN_KEY;
        vi.mocked(syncDomainScanTagsFromProjects).mockReset();
        vi.mocked(listDistinctDomainScanUserIds).mockReset();
        vi.mocked(invalidateDomainList).mockReset();
        vi.mocked(syncDomainScanTagsFromProjects).mockResolvedValue(3);
        vi.mocked(listDistinctDomainScanUserIds).mockResolvedValue(['u1', 'u2']);
    });

    afterEach(() => {
        process.env.CHECKION_ADMIN_API_KEY = prevKey;
    });

    it('returns 401 without admin bearer', async () => {
        const req = new NextRequest('http://localhost/api/admin/domain-scans/sync-project-tags', {
            method: 'POST',
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
        expect(syncDomainScanTagsFromProjects).not.toHaveBeenCalled();
    });

    it('defaults mode and accepts empty body', async () => {
        const req = new NextRequest('http://localhost/api/admin/domain-scans/sync-project-tags', {
            method: 'POST',
            headers: { Authorization: `Bearer ${ADMIN_KEY}` },
        });
        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(syncDomainScanTagsFromProjects).toHaveBeenCalledWith('replaceFromProject');
        const body = (await res.json()) as {
            mode: string;
            updatedRows: number;
            invalidatedUserListCaches: number;
        };
        expect(body.mode).toBe('replaceFromProject');
        expect(body.updatedRows).toBe(3);
        expect(body.invalidatedUserListCaches).toBe(2);
        expect(vi.mocked(invalidateDomainList)).toHaveBeenCalledWith('u1');
        expect(vi.mocked(invalidateDomainList)).toHaveBeenCalledWith('u2');
    });

    it('passes fillEmpty mode from JSON body', async () => {
        const req = new NextRequest('http://localhost/api/admin/domain-scans/sync-project-tags', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${ADMIN_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ mode: 'fillEmpty' }),
        });
        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(syncDomainScanTagsFromProjects).toHaveBeenCalledWith('fillEmpty');
    });
});
