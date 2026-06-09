/**
 * Table of contents — page keys map to `PdfContentPage` keys in ProjectReportDocument.
 */
import type React from 'react';
import type { ProjectReportBundle } from '@/lib/project-report/types';
import type { ProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';

/**
 * Manual TOC split only when a list truly overflows one A4 content column (~28 rows with header).
 * Conservative chunking at 12 caused a second page while the first still had free space.
 */
export const PDF_TOC_ENTRIES_PER_PAGE = 28;

export type PdfTocEntryDef = {
    pageKey: string;
    title: string;
    level?: 0 | 1;
};

export type PdfTocResolvedEntry = {
    title: string;
    pageNumber: number;
    level: 0 | 1;
};

export function estimateTocPageCount(entryCount: number): number {
    if (entryCount <= 0) return 1;
    return Math.ceil(entryCount / PDF_TOC_ENTRIES_PER_PAGE);
}

export function chunkTocEntries<T>(entries: T[], perPage = PDF_TOC_ENTRIES_PER_PAGE): T[][] {
    if (entries.length === 0) return [[]];
    const chunks: T[][] = [];
    for (let i = 0; i < entries.length; i += perPage) {
        chunks.push(entries.slice(i, i + perPage));
    }
    return chunks;
}

/** Ordered TOC plan for project reports (before page-number resolution). */
export function buildProjectReportTocPlan(
    bundle: ProjectReportBundle,
    labels: ProjectReportPdfLabels
): PdfTocEntryDef[] {
    const isComprehensive = bundle.variant === 'comprehensive' || bundle.variant === 'full';
    const hasAudience =
        bundle.audience?.available === true && (bundle.audience.personas.length ?? 0) > 0;

    const plan: PdfTocEntryDef[] = [
        { pageKey: 'executive', title: labels.executiveSummary },
        { pageKey: 'quality', title: labels.siteQuality },
        { pageKey: 'seo', title: labels.seoRankings },
        { pageKey: 'geo', title: labels.geoEeat },
        { pageKey: 'topics', title: labels.contentTopics },
    ];

    if (hasAudience) {
        plan.push({ pageKey: 'audience-intro', title: labels.audienceReality });
        plan.push({
            pageKey: 'audience-personas',
            title: labels.audiencePersonas,
            level: 1,
        });
    }

    plan.push({ pageKey: 'actions', title: labels.actionPlan });

    if (isComprehensive && bundle.deep) {
        plan.push(
            { pageKey: 'deep-metrics', title: labels.metricsOverview },
            { pageKey: 'deep-findings', title: labels.keyFindings },
            { pageKey: 'deep-competitive', title: labels.competitiveBenchmark },
            { pageKey: 'deep-keywords', title: labels.keywordDetails },
            { pageKey: 'deep-geo-models', title: labels.geoModelBenchmark },
            { pageKey: 'deep-geo-questions', title: labels.geoQuestionAnalysis },
            { pageKey: 'deep-geo-pages', title: labels.geoOnPageEeat },
            { pageKey: 'deep-issues-seo', title: labels.technicalAppendix }
        );
    }

    return plan;
}

export function buildProjectReportTocChunks(
    pages: React.ReactElement[],
    plan: PdfTocEntryDef[]
): PdfTocResolvedEntry[][] {
    const present = plan
        .map((entry) => {
            const pageIndex = pages.findIndex((page) => String(page.key ?? '') === entry.pageKey);
            if (pageIndex < 0) return null;
            return { entry, pageIndex };
        })
        .filter((row): row is { entry: PdfTocEntryDef; pageIndex: number } => row != null);

    const tocPageCount = estimateTocPageCount(present.length);
    const resolved = present.map(({ entry, pageIndex }) => ({
        title: entry.title,
        pageNumber: pageIndex + 1 + tocPageCount,
        level: entry.level ?? 0,
    }));

    return chunkTocEntries(resolved);
}

/** @deprecated use buildProjectReportTocChunks */
export function resolveProjectReportTocEntries(
    pages: React.ReactElement[],
    plan: PdfTocEntryDef[]
): PdfTocResolvedEntry[] {
    return buildProjectReportTocChunks(pages, plan).flat();
}

export function insertProjectReportTableOfContents(
    pages: React.ReactElement[],
    bundle: ProjectReportBundle,
    labels: ProjectReportPdfLabels,
    buildTocPages: (
        chunks: PdfTocResolvedEntry[][],
        startPageIndex: number
    ) => React.ReactElement[]
): React.ReactElement[] {
    if (pages.length <= 1) return pages;

    const plan = buildProjectReportTocPlan(bundle, labels);
    const chunks = buildProjectReportTocChunks(pages, plan);
    if (chunks.flat().length === 0) return pages;

    const tocPages = buildTocPages(chunks, 1);

    return [pages[0], ...tocPages, ...pages.slice(1)];
}
