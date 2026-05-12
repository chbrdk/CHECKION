import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));

vi.mock('@/lib/db/scans', () => ({
    getScan: vi.fn(),
    getDomainScan: vi.fn(),
}));

vi.mock('@/lib/db/journey-runs', () => ({
    getJourneyRun: vi.fn(),
    resolveJourneyRunProjectAssignmentContext: vi.fn(),
}));

vi.mock('@/lib/db/geo-eeat-runs', () => ({
    getGeoEeatRun: vi.fn(),
    resolveGeoEeatRunProjectAssignmentContext: vi.fn(),
}));

vi.mock('@/lib/db/shares', () => ({
    createShare: vi.fn(),
    getShareByResource: vi.fn(),
}));

vi.mock('@/lib/domain-scan-access', () => ({
    getDomainScanAccess: vi.fn(),
}));

import { POST } from '@/app/api/share/route';
import { getRequestUser } from '@/lib/auth-api-token';
import { createShare, getShareByResource } from '@/lib/db/shares';
import { getGeoEeatRun, resolveGeoEeatRunProjectAssignmentContext } from '@/lib/db/geo-eeat-runs';

describe('POST /api/share shared-project access', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(getShareByResource).mockReset();
        vi.mocked(createShare).mockReset();
        vi.mocked(resolveGeoEeatRunProjectAssignmentContext).mockReset();
        vi.mocked(getGeoEeatRun).mockReset();
    });

    it('creates a share for a shared GEO run using the resource owner context', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'viewer-1' } as any);
        vi.mocked(getShareByResource).mockResolvedValue(null);
        vi.mocked(resolveGeoEeatRunProjectAssignmentContext).mockResolvedValue({
            resourceUserId: 'owner-1',
            currentProjectId: 'project-shared',
        });
        vi.mocked(getGeoEeatRun).mockResolvedValue({
            id: 'geo-1',
            userId: 'owner-1',
            projectId: 'project-shared',
            status: 'complete',
        } as any);

        const req = new Request('https://checkion.example.com/api/share', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                host: 'checkion.example.com',
                'x-forwarded-proto': 'https',
            },
            body: JSON.stringify({ type: 'geo_eeat', id: 'geo-1' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        const body = await res.json();

        expect(resolveGeoEeatRunProjectAssignmentContext).toHaveBeenCalledWith('geo-1', 'viewer-1');
        expect(getGeoEeatRun).toHaveBeenCalledWith('geo-1', 'owner-1');
        expect(createShare).toHaveBeenCalledWith(body.token, 'viewer-1', 'geo_eeat', 'geo-1', { password: undefined });
        expect(body.url).toBe(`https://checkion.example.com/share/${encodeURIComponent(body.token)}`);
        expect(body.alreadyShared).toBe(false);
    });
});
