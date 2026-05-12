import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));
vi.mock('@/lib/rate-limit', () => ({
    checkRateLimit: vi.fn(),
}));
vi.mock('@/lib/db/projects', () => ({
    getProject: vi.fn(),
}));
vi.mock('@/lib/domain-scan-start', () => ({
    startDomainScan: vi.fn(),
}));
vi.mock('@/lib/standalone-scan-reuse', () => ({
    tryReuseStandaloneScan: vi.fn(),
}));
vi.mock('@/lib/cache', () => ({
    invalidateScansList: vi.fn(),
    listCachedStandaloneScanSummaries: vi.fn(),
    getCachedStandaloneScansCount: vi.fn(),
}));
vi.mock('@/lib/db/scans', () => ({
    insertScanSession: vi.fn(),
    persistStandaloneScanRow: vi.fn(),
    listScansByGroupId: vi.fn(),
}));
vi.mock('@/lib/usage-report', () => ({
    reportUsage: vi.fn(),
}));
vi.mock('@/lib/project-industry-auto', () => ({
    maybeAutoFillProjectClassificationFromStandaloneScan: vi.fn(),
}));

import { getRequestUser } from '@/lib/auth-api-token';
import { checkRateLimit } from '@/lib/rate-limit';
import { getProject } from '@/lib/db/projects';
import { startDomainScan } from '@/lib/domain-scan-start';
import { tryReuseStandaloneScan } from '@/lib/standalone-scan-reuse';

describe('shared project owner routing', () => {
    const sharedProjectId = '11111111-1111-4111-8111-111111111111';

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'viewer-1' } as any);
        vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true } as any);
        vi.mocked(getProject).mockResolvedValue({
            id: sharedProjectId,
            userId: 'owner-1',
            tags: ['shared'],
            competitors: [],
        } as any);
    });

    it('starts deep scans with the project owner user id', async () => {
        vi.mocked(startDomainScan).mockResolvedValue({ id: 'domain-scan-1' });
        const { POST } = await import('@/app/api/scan/domain/route');
        const req = new NextRequest('http://localhost/api/scan/domain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: 'https://example.com',
                projectId: sharedProjectId,
            }),
        });

        const res = await POST(req);

        expect(res.status).toBe(202);
        expect(startDomainScan).toHaveBeenCalledWith('owner-1', 'https://example.com', {
            projectId: sharedProjectId,
            useSitemap: undefined,
            maxPages: undefined,
            skipUnchangedPages: undefined,
            classifyPageTopics: undefined,
        });
    });

    it('routes standalone shared-project scans through the project owner context', async () => {
        vi.mocked(tryReuseStandaloneScan).mockResolvedValue({
            desktopResult: {
                id: 'scan-1',
                url: 'https://example.com',
                device: 'desktop',
                result: { issues: [] },
            } as any,
        });

        const { POST } = await import('@/app/api/scan/route');
        const req = new Request('http://localhost/api/scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-checkion-scan-stream': '0',
            },
            body: JSON.stringify({
                url: 'https://example.com',
                projectId: sharedProjectId,
            }),
        });

        const res = await POST(req);

        expect(res.status).toBe(200);
        expect(tryReuseStandaloneScan).toHaveBeenCalledWith(
            'owner-1',
            expect.objectContaining({ projectId: sharedProjectId }),
            { skipSessionUserId: 'viewer-1' }
        );
    });
});
