/**
 * Compare consecutive domain deep scans (same lineage) for URL/header/page changes.
 */

import type { ScanResult } from '@/lib/types';
import { normalizeScanUrl } from '@/lib/url-normalize';

export type DomainPageChangeKind = 'new' | 'removed' | 'unchanged' | 'likely_updated';

export interface DomainPageDiffInput {
    url: string;
    documentCacheHints?: ScanResult['documentCacheHints'];
    reusedUnchanged?: boolean;
    contentFingerprint?: string;
    contentFreshnessAgeDays?: number | null;
    pageClassification?: {
        primaryTag?: string;
        tier?: number;
    };
}

export interface DomainPageChange {
    url: string;
    kind: DomainPageChangeKind;
    previousScanId?: string;
  signals?: {
    reusedUnchanged?: boolean;
    etagChanged?: boolean;
    lastModifiedChanged?: boolean;
    fingerprintChanged?: boolean;
    contentFreshnessDeltaDays?: number | null;
  };
    pageClassification?: { primaryTag?: string; tier?: number };
}

export interface DomainThemeChange {
    themeTag: string;
    themeTagKey: string;
    kind: 'new' | 'removed' | 'strengthened' | 'weakened' | 'tier_changed';
    previous?: {
        score: number;
        pageCount: number;
        maxTier: number;
        avgTier: number;
    };
    current?: {
        score: number;
        pageCount: number;
        maxTier: number;
        avgTier: number;
    };
    newPageUrls?: string[];
    removedPageUrls?: string[];
}

export interface DomainScanDiffResult {
    currentScanId: string;
    previousScanId: string | null;
    lineageKey: string;
    currentVersion: number;
    comparedAt: string;
    summary: {
        newCount: number;
        removedCount: number;
        unchangedCount: number;
        likelyUpdatedCount: number;
        totalCurrent: number;
        totalPrevious: number;
    };
    pages: DomainPageChange[];
    themes?: DomainThemeChange[];
}

export function normalizeDiffUrl(url: string): string {
    return normalizeScanUrl(url);
}

function normEtag(v: string | undefined): string {
    return (v ?? '').trim();
}

function normLastModified(v: string | undefined): string {
    return (v ?? '').trim();
}

function headersDiffer(
    current: DomainPageDiffInput,
    previous: DomainPageDiffInput,
): { etagChanged: boolean; lastModifiedChanged: boolean } {
    const curEtag = normEtag(current.documentCacheHints?.etag);
    const prevEtag = normEtag(previous.documentCacheHints?.etag);
    const curLm = normLastModified(current.documentCacheHints?.lastModified);
    const prevLm = normLastModified(previous.documentCacheHints?.lastModified);

    const etagChanged =
        Boolean(curEtag && prevEtag && curEtag !== prevEtag) ||
        Boolean((curEtag && !prevEtag) || (!curEtag && prevEtag));
    const lastModifiedChanged =
        Boolean(curLm && prevLm && curLm !== prevLm) ||
        Boolean((curLm && !prevLm) || (!curLm && prevLm));

    return { etagChanged, lastModifiedChanged };
}

function classifyPagePair(
    current: DomainPageDiffInput,
    previous: DomainPageDiffInput,
    previousScanId: string,
): DomainPageChange {
    if (current.reusedUnchanged === true) {
        return {
            url: current.url,
            kind: 'unchanged',
            previousScanId,
            signals: { reusedUnchanged: true },
            pageClassification: current.pageClassification,
        };
    }

    const { etagChanged, lastModifiedChanged } = headersDiffer(current, previous);
    if (etagChanged || lastModifiedChanged) {
        const curAge = current.contentFreshnessAgeDays ?? null;
        const prevAge = previous.contentFreshnessAgeDays ?? null;
        const contentFreshnessDeltaDays =
            curAge != null && prevAge != null ? curAge - prevAge : null;
        return {
            url: current.url,
            kind: 'likely_updated',
            previousScanId,
            signals: {
                etagChanged,
                lastModifiedChanged,
                contentFreshnessDeltaDays,
            },
            pageClassification: current.pageClassification,
        };
    }

    const curFp = (current.contentFingerprint ?? '').trim();
    const prevFp = (previous.contentFingerprint ?? '').trim();
    if (curFp && prevFp) {
        if (curFp === prevFp) {
            return {
                url: current.url,
                kind: 'unchanged',
                previousScanId,
                signals: { reusedUnchanged: false },
                pageClassification: current.pageClassification,
            };
        }
        return {
            url: current.url,
            kind: 'likely_updated',
            previousScanId,
            signals: { fingerprintChanged: true },
            pageClassification: current.pageClassification,
        };
    }

    const curEtag = normEtag(current.documentCacheHints?.etag);
    const prevEtag = normEtag(previous.documentCacheHints?.etag);
    const curLm = normLastModified(current.documentCacheHints?.lastModified);
    const prevLm = normLastModified(previous.documentCacheHints?.lastModified);
    const headersMatch =
        curEtag === prevEtag &&
        curLm === prevLm &&
        Boolean(curEtag || curLm || prevEtag || prevLm);

    if (headersMatch) {
        return {
            url: current.url,
            kind: 'unchanged',
            previousScanId,
            signals: { reusedUnchanged: false },
            pageClassification: current.pageClassification,
        };
    }

    return {
        url: current.url,
        kind: 'likely_updated',
        previousScanId,
        signals: {},
        pageClassification: current.pageClassification,
    };
}

function indexPagesByUrl(pages: DomainPageDiffInput[]): Map<string, DomainPageDiffInput> {
    const map = new Map<string, DomainPageDiffInput>();
    for (const p of pages) {
        const key = normalizeDiffUrl(p.url);
        if (!key) continue;
        map.set(key, { ...p, url: key });
    }
    return map;
}

function buildSummary(pages: DomainPageChange[], totalCurrent: number, totalPrevious: number) {
    let newCount = 0;
    let removedCount = 0;
    let unchangedCount = 0;
    let likelyUpdatedCount = 0;
    for (const p of pages) {
        switch (p.kind) {
            case 'new':
                newCount++;
                break;
            case 'removed':
                removedCount++;
                break;
            case 'unchanged':
                unchangedCount++;
                break;
            case 'likely_updated':
                likelyUpdatedCount++;
                break;
            default:
                break;
        }
    }
    return {
        newCount,
        removedCount,
        unchangedCount,
        likelyUpdatedCount,
        totalCurrent,
        totalPrevious,
    };
}

export interface BuildDomainScanDiffParams {
    currentScanId: string;
    previousScanId: string | null;
    lineageKey: string;
    currentVersion: number;
    currentPages: DomainPageDiffInput[];
    previousPages: DomainPageDiffInput[];
    themes?: DomainThemeChange[];
    comparedAt?: string;
}

/**
 * Pure diff between two page snapshots. When previousScanId is null, all current pages are `new`.
 */
export function buildDomainScanDiff(params: BuildDomainScanDiffParams): DomainScanDiffResult {
    const comparedAt = params.comparedAt ?? new Date().toISOString();
    const currentMap = indexPagesByUrl(params.currentPages);
    const previousMap = indexPagesByUrl(params.previousPages);

    const pages: DomainPageChange[] = [];

    if (!params.previousScanId) {
        for (const [, cur] of currentMap) {
            pages.push({
                url: cur.url,
                kind: 'new',
                pageClassification: cur.pageClassification,
            });
        }
        pages.sort((a, b) => a.url.localeCompare(b.url));
        return {
            currentScanId: params.currentScanId,
            previousScanId: null,
            lineageKey: params.lineageKey,
            currentVersion: params.currentVersion,
            comparedAt,
            summary: buildSummary(pages, currentMap.size, 0),
            pages,
            themes: params.themes,
        };
    }

    const allKeys = new Set([...currentMap.keys(), ...previousMap.keys()]);

    for (const key of allKeys) {
        const cur = currentMap.get(key);
        const prev = previousMap.get(key);

        if (cur && !prev) {
            pages.push({
                url: cur.url,
                kind: 'new',
                pageClassification: cur.pageClassification,
            });
        } else if (!cur && prev) {
            pages.push({
                url: prev.url,
                kind: 'removed',
                previousScanId: params.previousScanId,
            });
        } else if (cur && prev) {
            pages.push(classifyPagePair(cur, prev, params.previousScanId));
        }
    }

    pages.sort((a, b) => a.url.localeCompare(b.url));

    return {
        currentScanId: params.currentScanId,
        previousScanId: params.previousScanId,
        lineageKey: params.lineageKey,
        currentVersion: params.currentVersion,
        comparedAt,
        summary: buildSummary(pages, currentMap.size, previousMap.size),
        pages,
        themes: params.themes,
    };
}
