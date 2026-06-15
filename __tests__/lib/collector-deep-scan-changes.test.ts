import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/scans', () => ({
    getDomainScansCount: vi.fn().mockResolvedValue(1),
    getStandaloneScansCount: vi.fn().mockResolvedValue(0),
    getDomainScanWithProjectId: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/lib/db/rank-tracking-keywords', () => ({
    getKeywordsCountByProject: vi.fn().mockResolvedValue(0),
    listKeywordsByProject: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/db/rank-tracking-positions', () => ({
    listPositionsByKeyword: vi.fn().mockResolvedValue([]),
    getLastPositionsByKeywordIds: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock('@/lib/db/geo-eeat-runs', () => ({
    listGeoEeatRuns: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/db/domain-issues', () => ({
    listIssueGroupsPaged: vi.fn().mockResolvedValue({ data: [] }),
}));
vi.mock('@/lib/project-summaries/geo-question-history', () => ({
    buildProjectGeoQuestionHistory: vi.fn().mockResolvedValue([]),
    normalizeProjectDomainHost: vi.fn((d: string) => d),
}));
vi.mock('@/lib/project-competitor-changes', () => ({
    buildProjectCompetitorChanges: vi.fn(),
}));
vi.mock('@/lib/db/domain-scan-lineage-queries', () => ({
    getDomainScanTimestamp: vi.fn().mockResolvedValue('2024-01-02'),
}));

import { buildProjectCompetitorChanges } from '@/lib/project-competitor-changes';
import { collectDeepProjectReportData } from '@/lib/project-report/collector-deep';
import type { ProjectReportBundle } from '@/lib/project-report/types';

function baseFacts(): Omit<ProjectReportBundle, 'visuals' | 'narrative' | 'deep'> {
    return {
        locale: 'en',
        generatedAt: '2024-01-01',
        project: {
            id: 'p1',
            name: 'P',
            domain: 'example.com',
            industry: null,
            valueProposition: null,
            competitors: ['rival.com'],
            geoQueries: [],
            tags: [],
            counts: {
                domainScans: 1,
                singleScans: 0,
                journeyRuns: 0,
                geoEeatRuns: 0,
                rankTrackingKeywords: 0,
            },
        },
        domain: {
            scanId: 'own-1',
            domain: 'example.com',
            score: 80,
            wcagScore: 70,
            seoOnPageScore: 65,
            seoOnPageLabel: 'good',
            totalPageCount: 10,
            issueStats: { errors: 0, warnings: 0, notices: 0 },
            systemicIssues: [],
            llmSummary: null,
            performance: null,
            eco: null,
            pageClassification: null,
            evidenceIds: { domainScore: 'ev-own' },
        },
        competitors: [
            {
                domain: 'rival.com',
                scanId: 'c-1',
                status: 'complete',
                score: 75,
                wcagScore: 70,
                seoOnPageScore: 60,
                seoOnPageLabel: 'good',
                totalPageCount: 8,
                issueStats: { errors: 0, warnings: 0, notices: 0 },
                systemicIssues: [],
                llmSummary: null,
                performance: null,
                eco: null,
                pageClassification: null,
                evidenceIds: { domainScore: 'ev-rival' },
            },
        ],
        rankings: null,
        geo: null,
        journey: null,
        research: null,
        provenance: [],
    };
}

describe('collectDeepProjectReportData scanChanges', () => {
    beforeEach(() => {
        vi.mocked(buildProjectCompetitorChanges).mockReset();
    });

    it('attaches scanChanges to competitiveBenchmark', async () => {
        vi.mocked(buildProjectCompetitorChanges).mockResolvedValue({
            own: null,
            competitors: {
                'rival.com': {
                    currentScanId: 'c-2',
                    previousScanId: 'c-1',
                    lineageKey: 'k',
                    currentVersion: 2,
                    comparedAt: '2024-01-02',
                    summary: {
                        newCount: 2,
                        removedCount: 0,
                        unchangedCount: 6,
                        likelyUpdatedCount: 0,
                        totalCurrent: 8,
                        totalPrevious: 6,
                    },
                    pages: [],
                },
            },
        });

        const deep = await collectDeepProjectReportData(baseFacts(), 'user-1', 'p1');
        expect(deep.competitiveBenchmark?.scanChanges).toHaveLength(1);
        expect(deep.competitiveBenchmark?.scanChanges?.[0]?.domain).toBe('rival.com');
    });
});
