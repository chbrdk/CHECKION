/**
 * PATCH /api/scans/domain/[id]/tags
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-api-token', () => ({ getRequestUser: vi.fn() }));
vi.mock('@/lib/cache', () => ({ invalidateDomainList: vi.fn() }));
vi.mock('@/lib/db/scans', () => ({ updateDomainScanTags: vi.fn() }));

import { PATCH } from '@/app/api/scans/domain/[id]/tags/route';
import { getRequestUser } from '@/lib/auth-api-token';
import { updateDomainScanTags } from '@/lib/db/scans';

describe('PATCH /api/scans/domain/[id]/tags', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(updateDomainScanTags).mockReset();
    });

    it('returns 401 when not signed in', async () => {
        vi.mocked(getRequestUser).mockResolvedValue(null);
        const req = new NextRequest('http://localhost/api/scans/domain/x/tags', {
            method: 'PATCH',
            body: JSON.stringify({ tags: ['a'] }),
        });
        const res = await PATCH(req, { params: Promise.resolve({ id: 'x' }) });
        expect(res.status).toBe(401);
    });

    it('updates tags for owner', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' } as never);
        vi.mocked(updateDomainScanTags).mockResolvedValue(true);
        const req = new NextRequest('http://localhost/api/scans/domain/scan-1/tags', {
            method: 'PATCH',
            body: JSON.stringify({ tags: ['retail', 'q1'] }),
        });
        const res = await PATCH(req, { params: Promise.resolve({ id: 'scan-1' }) });
        expect(res.status).toBe(200);
        expect(updateDomainScanTags).toHaveBeenCalledWith('scan-1', 'u1', ['retail', 'q1']);
    });
});
