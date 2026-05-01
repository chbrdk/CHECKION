/**
 * PATCH /api/scans/[id]/tags
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/cache', () => ({ invalidateScansList: vi.fn() }));
vi.mock('@/lib/db/scans', () => ({ updateStandaloneScanTags: vi.fn() }));

import { PATCH } from '@/app/api/scans/[id]/tags/route';
import { invalidateScansList } from '@/lib/cache';
import { updateStandaloneScanTags } from '@/lib/db/scans';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));

import { getRequestUser } from '@/lib/auth-api-token';

describe('PATCH /api/scans/[id]/tags', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' } as any);
        vi.mocked(updateStandaloneScanTags).mockReset();
        vi.mocked(updateStandaloneScanTags).mockResolvedValue(true);
    });

    it('updates tags and invalidates list cache', async () => {
        const req = new NextRequest('http://localhost/api/scans/s1/tags', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags: ['retail', 'checkout'] }),
        });
        const res = await PATCH(req, { params: Promise.resolve({ id: 's1' }) });
        expect(res.status).toBe(200);
        expect(updateStandaloneScanTags).toHaveBeenCalledWith('s1', 'u1', ['retail', 'checkout']);
        expect(invalidateScansList).toHaveBeenCalledWith('u1');
    });
});
