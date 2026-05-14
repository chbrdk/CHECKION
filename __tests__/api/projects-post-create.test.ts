/**
 * POST /api/projects — optional platformCompanyId + PLEXON profile fallback.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));

vi.mock('@/lib/db/projects', () => ({
    insertProject: vi.fn(),
    listProjects: vi.fn(),
}));

vi.mock('@/lib/plexon-auth', () => ({
    isPlexonAuthConfigured: vi.fn(() => false),
    getPlexonProfile: vi.fn(),
}));

import { getRequestUser } from '@/lib/auth-api-token';
import { insertProject } from '@/lib/db/projects';
import { isPlexonAuthConfigured, getPlexonProfile } from '@/lib/plexon-auth';

describe('POST /api/projects', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' });
        vi.mocked(insertProject).mockResolvedValue(undefined);
        vi.mocked(isPlexonAuthConfigured).mockReturnValue(false);
    });

    it('passes platformCompanyId from body to insertProject', async () => {
        const { POST } = await import('@/app/api/projects/route');
        const res = await POST(
            new Request('http://localhost/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'N1', platformCompanyId: 'co-body' }),
            })
        );
        expect(res.status).toBe(200);
        expect(insertProject).toHaveBeenCalledWith(
            expect.any(String),
            'user-1',
            expect.objectContaining({ name: 'N1', platformCompanyId: 'co-body' })
        );
    });

    it('when PLEXON configured and body omits id, uses default_platform_company_id from profile', async () => {
        vi.mocked(isPlexonAuthConfigured).mockReturnValue(true);
        vi.mocked(getPlexonProfile).mockResolvedValue({
            id: 'user-1',
            email: 'a@b.c',
            default_platform_company_id: 'co-from-plexon',
        });
        const { POST } = await import('@/app/api/projects/route');
        const res = await POST(
            new Request('http://localhost/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'N2' }),
            })
        );
        expect(res.status).toBe(200);
        expect(getPlexonProfile).toHaveBeenCalledWith('user-1');
        expect(insertProject).toHaveBeenCalledWith(
            expect.any(String),
            'user-1',
            expect.objectContaining({ name: 'N2', platformCompanyId: 'co-from-plexon' })
        );
        const json = await res.json();
        expect(json.platformCompanyId).toBe('co-from-plexon');
    });
});
