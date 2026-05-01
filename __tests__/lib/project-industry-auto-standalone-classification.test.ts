import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ScanResult } from '@/lib/types';

const getProjectMock = vi.fn();

vi.mock('@/lib/db/projects', () => ({
    getProject: (...args: unknown[]) => getProjectMock(...args),
    updateProject: vi.fn().mockResolvedValue(false),
}));

vi.mock('@/lib/db/sync-domain-scan-tags-from-projects', () => ({
    syncDomainScanTagsForProjectId: vi.fn(),
}));
vi.mock('@/lib/db/sync-standalone-scan-tags-from-projects', () => ({
    syncStandaloneScansTagsForProjectId: vi.fn(),
}));
vi.mock('@/lib/cache', () => ({
    invalidateDomainList: vi.fn(),
    invalidateScansList: vi.fn(),
}));

import { maybeAutoFillProjectClassificationFromStandaloneScan } from '@/lib/project-industry-auto';

const minimalDesktop = {
    id: 's1',
    url: 'https://example.com',
    timestamp: new Date().toISOString(),
    standard: 'WCAG2AA' as const,
    device: 'desktop' as const,
    runners: [],
    issues: [],
    passes: [],
    stats: { error: 0, warning: 0, notice: 0 },
    durationMs: 0,
    score: 0,
    screenshot: '',
    performance: { ttfb: 0, fcp: 0, domLoad: 0, windowLoad: 0, lcp: 0 },
    eco: { co2: 0, grade: 'A' as const, pageWeight: 0 },
} satisfies ScanResult;

describe('maybeAutoFillProjectClassificationFromStandaloneScan', () => {
    beforeEach(() => {
        getProjectMock.mockReset();
        getProjectMock.mockResolvedValue(null);
    });

    it('passes args.userId through to getProject for tag and industry paths', async () => {
        await maybeAutoFillProjectClassificationFromStandaloneScan({
            userId: 'user-abc',
            projectId: 'proj-xyz',
            scanUrl: 'https://example.com',
            scanSessionId: 'sess-1',
            desktopResult: minimalDesktop,
        });

        expect(getProjectMock).toHaveBeenCalledTimes(2);
        expect(getProjectMock).toHaveBeenNthCalledWith(1, 'proj-xyz', 'user-abc');
        expect(getProjectMock).toHaveBeenNthCalledWith(2, 'proj-xyz', 'user-abc');
    });
});
