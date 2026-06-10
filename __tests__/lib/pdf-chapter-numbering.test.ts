import { describe, it, expect } from 'vitest';
import {
    assignOutlineNumbers,
    buildProjectReportOutline,
    formatNumberedTitle,
} from '@/lib/paths/pdf-chapter-numbering';
import { getProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import type { ProjectReportBundle } from '@/lib/project-report/types';

const minimalBundle: ProjectReportBundle = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    locale: 'de',
    variant: 'executive',
    project: {
        id: 'p1',
        name: 'Test',
        domain: 'example.com',
        industry: null,
        valueProposition: null,
        tags: [],
        competitors: [],
        counts: {
            domainScans: 0,
            journeyRuns: 0,
            geoEeatRuns: 0,
            singleScans: 0,
            rankTrackingKeywords: 0,
        },
    },
    domain: {
        score: 64,
        totalPageCount: 10,
        issueStats: { errors: 1, warnings: 2 },
        systemicIssues: [{ issueId: 'i1', title: 'Issue', pageCount: 2, type: 'error' }],
        performance: { avgTtfb: 100, avgFcp: 200, avgLcp: 300 },
        eco: { avgCo2: 1.2 },
        seoOnPageScore: 70,
        seoOnPageLabel: 'Good',
        llmSummary: null,
    },
    competitors: [],
    rankings: {
        score: 55,
        keywordCount: 3,
        topKeywords: [],
    },
    geo: null,
    rankTrends: [],
    journey: null,
    visuals: [{ kind: 'rankTrend', title: 'Trend', data: [] }],
    narrative: {
        executiveSummary: 'Summary',
        competitiveLandscape: 'Competitors',
        recommendations: [],
        riskAmpel: { wcag: 'high', geo: 'medium', rankings: 'low' },
        findings: [],
        sections: {},
    },
    deep: null,
    audience: null,
    provenance: [],
    freshness: { sources: [] },
    links: {
        projectPath: '/projects/p1',
        domainScanPath: null,
        geoRunPath: null,
        rankingsPath: '/projects/p1/rankings',
    },
};

describe('pdf-chapter-numbering', () => {
    it('assigns main and sub chapter numbers in order', () => {
        const labels = getProjectReportPdfLabels('de');
        const outline = buildProjectReportOutline(minimalBundle, labels);
        const numbers = assignOutlineNumbers(outline);

        expect(numbers.get('executive')).toBe('1');
        expect(numbers.get('executive.competitors')).toBe('1.1');
        expect(numbers.get('quality')).toBe('2');
        expect(numbers.get('quality.systemic-issues')).toBe('2.1');
        expect(numbers.get('seo')).toBe('3');
        expect(numbers.get('seo.on-page')).toBe('3.1');
        expect(numbers.get('seo.serp-rankings')).toBe('3.2');
        expect(numbers.get('seo.rank-trends')).toBe('3.3');
    });

    it('formats numbered titles', () => {
        expect(formatNumberedTitle('2.1', 'Systemische Issues')).toBe('2.1 Systemische Issues');
    });
});
