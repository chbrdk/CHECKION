/**
 * TOC page numbers account for inserted pages after the cover.
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import {
    buildProjectReportTocChunks,
    buildProjectReportTocPlan,
    chunkTocEntries,
    estimateTocPageCount,
    insertProjectReportTableOfContents,
    resolveProjectReportTocEntries,
} from '@/lib/paths/pdf-table-of-contents';
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
    provenance: [],
    freshness: { sources: [] },
    links: {
        projectPath: '/projects/p1',
        domainScanPath: null,
        geoRunPath: null,
        rankingsPath: '/projects/p1/rankings',
    },
};

function page(key: string) {
    return React.createElement('div', { key });
}

describe('pdf-table-of-contents', () => {
    it('estimates TOC page count from entry count', () => {
        expect(estimateTocPageCount(1)).toBe(1);
        expect(estimateTocPageCount(17)).toBe(1);
        expect(estimateTocPageCount(28)).toBe(1);
        expect(estimateTocPageCount(29)).toBe(2);
    });

    it('chunks entries only when list exceeds one printable page', () => {
        const items = Array.from({ length: 17 }, (_, i) => i);
        expect(chunkTocEntries(items)).toHaveLength(1);
        expect(chunkTocEntries(items)[0]).toHaveLength(17);

        const overflow = Array.from({ length: 29 }, (_, i) => i);
        expect(chunkTocEntries(overflow)).toHaveLength(2);
    });

    it('includes numbered sub-chapters in comprehensive preview TOC', async () => {
        const { buildComprehensivePreviewBundle } = await import(
            '@/lib/paths/pdf-print-preview-bundle'
        );
        const { buildProjectReportPages } = await import('@/components/pdf/ProjectReportDocument');
        const { buildProjectReportOutline } = await import('@/lib/paths/pdf-chapter-numbering');
        const labels = getProjectReportPdfLabels('de');
        const bundle = buildComprehensivePreviewBundle();
        const pages = buildProjectReportPages(bundle);
        const outline = buildProjectReportOutline(bundle, labels);
        const chunks = buildProjectReportTocChunks(pages, outline);
        expect(outline.some((e) => e.level === 1)).toBe(true);
        expect(chunks.flat().every((e) => e.number.includes('.' ) || /^\d+$/.test(e.number))).toBe(true);
        expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('shifts page numbers by inserted TOC length', () => {
        const pages = [page('cover'), page('executive'), page('quality'), page('seo')];
        const labels = getProjectReportPdfLabels('de');
        const plan = buildProjectReportTocPlan(minimalBundle, labels);
        const resolved = resolveProjectReportTocEntries(pages, plan);

        const executive = resolved.find((e) => e.title === labels.executiveSummary);
        expect(executive?.pageNumber).toBe(3);
        expect(executive?.number).toBe('1');
    });

    it('inserts TOC after cover', () => {
        const pages = [page('cover'), page('executive'), page('quality')];
        const labels = getProjectReportPdfLabels('de');
        const next = insertProjectReportTableOfContents(pages, minimalBundle, labels, (chunks) =>
            chunks.map((chunk, i) => page(`toc-${i}`))
        );

        expect(String(next[0]?.key)).toBe('cover');
        expect(String(next[1]?.key)).toBe('toc-0');
        expect(String(next[2]?.key)).toBe('executive');
    });

    it('includes audience entries when overlay is available', () => {
        const labels = getProjectReportPdfLabels('de');
        const plan = buildProjectReportTocPlan(
            {
                ...minimalBundle,
                audience: {
                    available: true,
                    audionProjectId: 'a1',
                    audionProjectName: 'TG',
                    targetGroups: [],
                    personas: [
                        {
                            personaId: 'p1',
                            personaName: 'A',
                            targetGroupId: 'tg',
                            targetGroupName: 'TG',
                            headline: 'h',
                            painPoints: [],
                            goals: [],
                            pillars: [],
                            overallFit: 'mixed',
                            insights: [],
                            geoQuestionMatches: [],
                            evidenceId: 'e1',
                        },
                    ],
                    summaryInsights: [],
                },
            },
            labels
        );

        expect(plan.some((e) => e.pageKey === 'audience-intro')).toBe(true);
        expect(plan.some((e) => e.pageKey === 'audience-personas')).toBe(true);
        expect(plan.some((e) => e.id === 'audience.personas' && e.level === 1)).toBe(true);
    });
});
