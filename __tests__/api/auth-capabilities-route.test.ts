/**
 * GET /api/auth/capabilities
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-api-token', () => ({ getRequestUser: vi.fn() }));
vi.mock('@/lib/auth-global-domain-list', () => ({ canListAllUsersDomainScans: vi.fn() }));

import { GET } from '@/app/api/auth/capabilities/route';
import { getRequestUser } from '@/lib/auth-api-token';
import { canListAllUsersDomainScans } from '@/lib/auth-global-domain-list';
import { uxJourneyAgentEnabled } from '@/lib/ux-journey-agent-enabled';

vi.mock('@/lib/ux-journey-agent-enabled', () => ({ uxJourneyAgentEnabled: vi.fn() }));

describe('GET /api/auth/capabilities', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(canListAllUsersDomainScans).mockReset();
    });

    it('returns 401 when not signed in', async () => {
        vi.mocked(getRequestUser).mockResolvedValue(null);
        const res = await GET(new Request('http://localhost/api/auth/capabilities'));
        expect(res.status).toBe(401);
    });

    it('returns userId and domainScansListAllUsers', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u-op' } as never);
        vi.mocked(canListAllUsersDomainScans).mockReturnValue(true);
        vi.mocked(uxJourneyAgentEnabled).mockReturnValue(false);
        const res = await GET(new Request('http://localhost/api/auth/capabilities'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as {
            userId: string;
            domainScansListAllUsers: boolean;
            uxJourneyAgentEnabled: boolean;
        };
        expect(body.userId).toBe('u-op');
        expect(body.domainScansListAllUsers).toBe(true);
        expect(body.uxJourneyAgentEnabled).toBe(false);
    });
});
