/**
 * Tests for project report collector evidence registration.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/projects', () => ({
    getProject: vi.fn(),
}));

vi.mock('@/lib/project-summaries/domain-summary-all', () => ({
    buildProjectDomainSummaryAll: vi.fn(),
}));

vi.mock('@/lib/project-summaries/ranking-summary', () => ({
    buildProjectRankingSummary: vi.fn(),
    positionToPoints: vi.fn((p: number | null) => (p === 1 ? 100 : 0)),
}));

vi.mock('@/lib/project-summaries/geo-summary', () => ({
    buildProjectGeoSummary: vi.fn(),
    normalizeGeoDomain: vi.fn((d: string) => d.replace(/^https?:\/\//, '').split('/')[0]),
    scoreFromGeoMetrics: vi.fn(),
}));

vi.mock('@/lib/db/rank-tracking-keywords', () => ({
    listKeywordsByProject: vi.fn(),
}));

vi.mock('@/lib/db/rank-tracking-positions', () => ({
    getLastPositionsByKeywordIds: vi.fn(),
    listPositionsByKeyword: vi.fn(),
}));

vi.mock('@/lib/db/geo-eeat-runs', () => ({
    listGeoEeatRuns: vi.fn(),
}));

vi.mock('@/lib/db/journey-runs', () => ({
    listJourneyRuns: vi.fn(),
}));

import { getProject } from '@/lib/db/projects';
import { buildProjectDomainSummaryAll } from '@/lib/project-summaries/domain-summary-all';
import { buildProjectRankingSummary } from '@/lib/project-summaries/ranking-summary';
import { buildProjectGeoSummary } from '@/lib/project-summaries/geo-summary';
import { listKeywordsByProject } from '@/lib/db/rank-tracking-keywords';
import { getLastPositionsByKeywordIds, listPositionsByKeyword } from '@/lib/db/rank-tracking-positions';
import { listGeoEeatRuns } from '@/lib/db/geo-eeat-runs';
import { listJourneyRuns } from '@/lib/db/journey-runs';
import { collectProjectReportFacts } from '@/lib/project-report/collector';

describe('collectProjectReportFacts', () => {
    beforeEach(() => {
        vi.mocked(getProject).mockResolvedValue({
            id: 'proj-1',
            userId: 'user-1',
            name: 'Test Project',
            domain: 'example.com',
            industry: 'saas',
            valueProposition: 'We test.',
            competitors: ['competitor.com'],
            geoQueries: [],
            geoQueriesByMarket: {},
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        } as Awaited<ReturnType<typeof getProject>>);

        vi.mocked(buildProjectDomainSummaryAll).mockResolvedValue({
            own: {
                scanId: 'scan-1',
                score: 80,
                totalPageCount: 50,
                wcagScore: 72,
                seoOnPageScore: 65,
                seoOnPageLabel: 'good',
                scannedAt: '2026-01-01T00:00:00.000Z',
                llmSummary: null,
                aggregated: { performance: null, eco: null, pageClassification: null },
                issueStats: { errors: 1, warnings: 2, notices: 0 },
                systemicIssues: [{ issueId: 'i1', title: 'Missing alt', count: 5, pages: [] }],
                domain: 'example.com',
            },
            competitors: {},
        });

        vi.mocked(buildProjectRankingSummary).mockResolvedValue({
            score: 80,
            keywordCount: 2,
            lastUpdated: '2026-01-02T00:00:00.000Z',
            competitorScores: {},
        });

        vi.mocked(buildProjectGeoSummary).mockResolvedValue({
            score: 60,
            competitorScores: {},
            runs: [],
            latestComplete: null,
        });

        vi.mocked(listKeywordsByProject).mockResolvedValue([
            {
                id: 'kw-1',
                userId: 'user-1',
                projectId: 'proj-1',
                domain: 'example.com',
                keyword: 'brand',
                country: 'de',
                language: 'de',
                intentKey: null,
                intentLabel: null,
                device: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ]);

        vi.mocked(getLastPositionsByKeywordIds).mockResolvedValue(
            new Map([
                [
                    'kw-1',
                    {
                        position: 1,
                        recordedAt: new Date('2026-01-02'),
                    },
                ],
            ])
        );

        vi.mocked(listPositionsByKeyword).mockResolvedValue([]);
        vi.mocked(listGeoEeatRuns).mockResolvedValue([]);
        vi.mocked(listJourneyRuns).mockResolvedValue([]);
    });

    it('collects facts with evidence IDs in provenance', async () => {
        const result = await collectProjectReportFacts('proj-1', 'user-1', {
            locale: 'de',
            variant: 'executive',
        });

        expect(result.project.name).toBe('Test Project');
        expect(result.domain?.wcagScore).toBe(72);
        expect(result.rankings?.score).toBe(80);
        expect(result.provenance.some((p) => p.evidenceId === 'ev-wcag-score')).toBe(true);
        expect(result.provenance.some((p) => p.evidenceId === 'ev-ranking-score')).toBe(true);
        expect(result.links.projectPath).toContain('proj-1');
    });

    it('throws when project not found', async () => {
        vi.mocked(getProject).mockResolvedValue(null);
        await expect(
            collectProjectReportFacts('missing', 'user-1', { locale: 'en', variant: 'executive' })
        ).rejects.toThrow('Project not found');
    });
});
