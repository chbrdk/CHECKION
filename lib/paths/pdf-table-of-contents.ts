/**
 * Table of contents — driven by `buildProjectReportOutline` in pdf-chapter-numbering.
 */
import type React from 'react';
import type { ProjectReportBundle } from '@/lib/project-report/types';
import type { ProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import {
    assignOutlineNumbers,
    buildProjectReportOutline,
    type PdfOutlineEntry,
} from '@/lib/paths/pdf-chapter-numbering';

/**
 * Manual TOC split only when a list truly overflows one A4 content column (~28 rows with header).
 */
export const PDF_TOC_ENTRIES_PER_PAGE = 28;

/** @deprecated use PdfOutlineEntry from pdf-chapter-numbering */
export type PdfTocEntryDef = PdfOutlineEntry;

export type PdfTocResolvedEntry = {
    number: string;
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

/** @deprecated use buildProjectReportOutline */
export function buildProjectReportTocPlan(
    bundle: ProjectReportBundle,
    labels: ProjectReportPdfLabels
): PdfOutlineEntry[] {
    return buildProjectReportOutline(bundle, labels);
}

export function buildProjectReportTocChunks(
    pages: React.ReactElement[],
    outline: PdfOutlineEntry[]
): PdfTocResolvedEntry[][] {
    const numbers = assignOutlineNumbers(outline);
    const pageIndexByKey = new Map<string, number>();
    pages.forEach((page, index) => {
        const key = String(page.key ?? '');
        if (key && !pageIndexByKey.has(key)) {
            pageIndexByKey.set(key, index);
        }
    });

    const tocPageCount = estimateTocPageCount(outline.length);
    const resolved: PdfTocResolvedEntry[] = [];

    for (const entry of outline) {
        const pageIndex = pageIndexByKey.get(entry.pageKey);
        if (pageIndex == null || pageIndex < 0) continue;
        const number = numbers.get(entry.id);
        if (!number) continue;
        resolved.push({
            number,
            title: entry.title,
            pageNumber: pageIndex + 1 + tocPageCount,
            level: entry.level,
        });
    }

    return chunkTocEntries(resolved);
}

/** @deprecated use buildProjectReportTocChunks */
export function resolveProjectReportTocEntries(
    pages: React.ReactElement[],
    outline: PdfOutlineEntry[]
): PdfTocResolvedEntry[] {
    return buildProjectReportTocChunks(pages, outline).flat();
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

    const outline = buildProjectReportOutline(bundle, labels);
    const chunks = buildProjectReportTocChunks(pages, outline);
    if (chunks.flat().length === 0) return pages;

    const tocPages = buildTocPages(chunks, 1);

    return [pages[0], ...tocPages, ...pages.slice(1)];
}
