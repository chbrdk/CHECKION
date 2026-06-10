import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));

vi.mock('@/lib/db/projects', () => ({
    getProject: vi.fn(),
}));

vi.mock('@/lib/db/project-report-runs', () => ({
    getLatestCompleteProjectReportRun: vi.fn(),
}));

import { emptyProjectSetupContext } from '@/lib/project-report/project-setup-context';
import { emptyEchonMarketContext } from '@/lib/project-report/echon-market-context';
import { GET } from '@/app/api/projects/[id]/report/latest/route';
import { getRequestUser } from '@/lib/auth-api-token';
import { getProject } from '@/lib/db/projects';
import { getLatestCompleteProjectReportRun } from '@/lib/db/project-report-runs';

const minimalBundle = {
    version: '1.0' as const,
    generatedAt: '2026-01-01T00:00:00.000Z',
    locale: 'de' as const,
    variant: 'executive' as const,
    project: { id: 'p1', name: 'Test', domain: 'example.com', industry: null, valueProposition: null, tags: [], competitors: [], counts: { domainScans: 0, journeyRuns: 0, geoEeatRuns: 0, singleScans: 0, rankTrackingKeywords: 0 } },
    domain: null,
    competitors: [],
    rankings: null,
    geo: null,
    rankTrends: [],
    journey: null,
    visuals: [],
    narrative: null,
    deep: null,
    audience: null,
    setup: emptyProjectSetupContext(),
    marketContext: emptyEchonMarketContext(),
    provenance: [],
    freshness: { sources: [] },
    links: { projectPath: '/projects/p1', domainScanPath: null, geoRunPath: null, rankingsPath: '/projects/p1/rankings' },
};

describe('GET /api/projects/[id]/report/latest', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' } as never);
        vi.mocked(getProject).mockResolvedValue({ id: 'p1', userId: 'u1' } as never);
    });

    it('returns null when no completed run exists', async () => {
        vi.mocked(getLatestCompleteProjectReportRun).mockResolvedValue(null);
        const res = await GET({} as never, { params: Promise.resolve({ id: 'p1' }) });
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data).toBeNull();
    });

    it('returns stored bundle for latest complete run', async () => {
        vi.mocked(getLatestCompleteProjectReportRun).mockResolvedValue({
            id: 'run-1',
            userId: 'u1',
            projectId: 'p1',
            status: 'complete',
            locale: 'de',
            variant: 'executive',
            bundle: minimalBundle,
            progress: null,
            error: null,
            createdAt: new Date('2026-01-01'),
            completedAt: new Date('2026-01-02'),
        });
        const res = await GET({} as never, { params: Promise.resolve({ id: 'p1' }) });
        const json = await res.json();
        expect(json.data.id).toBe('run-1');
        expect(json.data.bundle.project.name).toBe('Test');
    });
});
