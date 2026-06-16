import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/competitor-rescan-cron', () => ({
    runCompetitorRescanCron: vi.fn().mockResolvedValue({ scansStarted: 1 }),
}));

import { NextRequest } from 'next/server';
import { runCompetitorRescanCron } from '@/lib/competitor-rescan-cron';
import { POST } from '@/app/api/cron/competitor-rescans/route';

describe('POST /api/cron/competitor-rescans', () => {
    const prevSecret = process.env.CHECKION_CRON_SECRET;

    beforeEach(() => {
        process.env.CHECKION_CRON_SECRET = 'test-secret';
        vi.mocked(runCompetitorRescanCron).mockClear();
    });

    afterEach(() => {
        process.env.CHECKION_CRON_SECRET = prevSecret;
    });

    it('returns 401 without bearer token', async () => {
        const res = await POST(new NextRequest('http://localhost/api/cron/competitor-rescans', { method: 'POST' }));
        expect(res.status).toBe(401);
    });

    it('runs cron with valid secret', async () => {
        const res = await POST(
            new NextRequest('http://localhost/api/cron/competitor-rescans', {
                method: 'POST',
                headers: { Authorization: 'Bearer test-secret' },
            }),
        );
        expect(res.status).toBe(200);
        expect(runCompetitorRescanCron).toHaveBeenCalled();
    });
});
