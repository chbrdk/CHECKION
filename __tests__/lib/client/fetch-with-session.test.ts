/**
 * fetchWithSessionCookies — retries once after 401 when session refresh succeeds.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithSessionCookies } from '@/lib/client/fetch-with-session';

vi.mock('next-auth/react', () => ({
    getSession: vi.fn().mockResolvedValue({ user: { id: 'u1' } }),
}));

describe('fetchWithSessionCookies', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValueOnce(new Response(null, { status: 401 }))
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('retries fetch after 401', async () => {
        const res = await fetchWithSessionCookies('/api/test', { credentials: 'include' });
        expect(res.status).toBe(200);
        expect(fetch).toHaveBeenCalledTimes(2);
    });
});
