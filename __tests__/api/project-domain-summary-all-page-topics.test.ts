import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));
vi.mock('@/lib/db/projects', () => ({
    getProject: vi.fn(),
}));
vi.mock('@/lib/db/scans', () => ({
    listDomainScanSummaries: vi.fn(),
    getDomainScanWithProjectId: vi.fn(),
}));
vi.mock('@/lib/db/project-domain-references', () => ({
    getProjectDomainScanReferences: vi.fn(),
}));
vi.mock('@/lib/domain-summary', () => ({
    buildDomainSummary: vi.fn(),
    toLightAggregated: vi.fn((agg: { pageClassification?: unknown }) => ({
        ...agg,
        pageClassification: agg.pageClassification
            ? { ...agg.pageClassification, capped: true }
            : null,
    })),
}));

import { getRequestUser } from '@/lib/auth-api-token';
import { getProject } from '@/lib/db/projects';
import { listDomainScanSummaries, getDomainScanWithProjectId } from '@/lib/db/scans';
import { getProjectDomainScanReferences } from '@/lib/db/project-domain-references';
import { buildDomainSummary } from '@/lib/domain-summary';
import { GET } from '@/app/api/projects/[id]/domain-summary-all/route';

const samplePc = {
    coverage: { totalPages: 10, pagesWithClassification: 8 },
    topThemes: [],
    tierDistribution: {
        avgTagsPerPageByTier: { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 },
        pagesWithAtLeastOneTier5: 0,
        pagesDominatedByLowTiers: 0,
    },
    pageSamples: [],
};

describe('GET /api/projects/[id]/domain-summary-all pageClassification', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(getProject).mockReset();
        vi.mocked(listDomainScanSummaries).mockReset();
        vi.mocked(getDomainScanWithProjectId).mockReset();
        vi.mocked(getProjectDomainScanReferences).mockReset();
        vi.mocked(buildDomainSummary).mockReset();
    });

    it('includes capped pageClassification for own and complete competitors', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' } as any);
        vi.mocked(getProject).mockResolvedValue({ id: 'p1' } as any);
        vi.mocked(listDomainScanSummaries).mockResolvedValue([{ id: 'scan-own' }] as any);
        vi.mocked(getProjectDomainScanReferences).mockResolvedValue([
            { domain: 'comp.example', domainScanId: 'scan-c1' },
        ] as any);

        vi.mocked(getDomainScanWithProjectId)
            .mockResolvedValueOnce({
                result: { status: 'complete' },
                projectId: 'p1',
            } as any)
            .mockResolvedValueOnce({
                result: { status: 'complete' },
                projectId: null,
            } as any);

        vi.mocked(buildDomainSummary)
            .mockReturnValueOnce({
                score: 80,
                totalPageCount: 10,
                pages: [],
                aggregated: {
                    issues: { stats: { errors: 0, warnings: 0, notices: 0 } },
                    seo: {},
                    structure: {},
                    performance: null,
                    eco: null,
                    pageClassification: samplePc,
                },
            } as any)
            .mockReturnValueOnce({
                score: 70,
                totalPageCount: 5,
                pages: [],
                aggregated: {
                    issues: { stats: { errors: 0, warnings: 0, notices: 0 } },
                    seo: {},
                    structure: {},
                    performance: null,
                    eco: null,
                    pageClassification: samplePc,
                },
            } as any);

        const res = await GET(new Request('http://localhost/api/projects/p1/domain-summary-all') as any, {
            params: Promise.resolve({ id: 'p1' }),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.own.aggregated.pageClassification).toMatchObject({ capped: true, coverage: samplePc.coverage });
        expect(body.data.competitors['comp.example'].aggregated.pageClassification).toMatchObject({
            capped: true,
        });
    });

    it('sets pageClassification null for incomplete competitor scans', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' } as any);
        vi.mocked(getProject).mockResolvedValue({ id: 'p1' } as any);
        vi.mocked(listDomainScanSummaries).mockResolvedValue([]);
        vi.mocked(getProjectDomainScanReferences).mockResolvedValue([
            { domain: 'comp.example', domainScanId: 'scan-c1' },
        ] as any);
        vi.mocked(getDomainScanWithProjectId).mockResolvedValue({
            result: { status: 'scanning' },
            projectId: null,
        } as any);

        const res = await GET(new Request('http://localhost/api/projects/p1/domain-summary-all') as any, {
            params: Promise.resolve({ id: 'p1' }),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.competitors['comp.example'].aggregated.pageClassification).toBeNull();
    });
});
