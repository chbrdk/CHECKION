/**
 * Persisted domain payload: capped aggregated via toStoredAggregated / buildStoredDomainPayload.
 */
import { describe, expect, it } from 'vitest';
import { buildStoredDomainPayload, toStoredAggregated } from '@/lib/domain-summary';
import type { DomainSummaryResponse } from '@/lib/domain-summary';
import {
    DOMAIN_STORED_SUMMARY_UX_BROKEN_LINKS_CAP,
    DOMAIN_STORED_SUMMARY_UX_LIST_CAP,
} from '@/lib/constants';
import type { ScanResult } from '@/lib/types';

describe('toStoredAggregated', () => {
    it('caps URL-heavy arrays like light mode when caps match', () => {
        const urls = Array.from({ length: 50 }, (_, i) => `https://ex.test/p${i}`);
        const aggregated = {
            issues: {
                stats: { errors: 1, warnings: 0, notices: 0, total: 1 },
                issues: [],
                levelStats: { A: 0, AA: 0, AAA: 0, APCA: 0, Unknown: 0 },
                pagesByIssueCount: urls.map((url) => ({
                    url,
                    errors: 1,
                    warnings: 0,
                    notices: 0,
                })),
            },
            ux: {
                score: 50,
                cls: 0.1,
                readability: { grade: 'A', score: 80 },
                tapTargets: { issues: [], detailsByPage: urls.map((url) => ({ url, count: 2 })) },
                focusOrderByPage: urls.map((url) => ({ url, count: 1 })),
                brokenLinks: urls.map((pageUrl) => ({
                    href: 'x',
                    status: 404,
                    text: 't',
                    pageUrl,
                })),
                consoleErrorsByPage: urls.map((url) => ({ url, count: 1 })),
                headingHierarchy: { pagesWithMultipleH1: 0, pagesWithSkippedLevels: 0, totalPages: 50 },
                pageCount: 50,
                pagesByScore: urls.map((url) => ({ url, score: 50, cls: 0 })),
            },
            seo: null,
            links: null,
            infra: null,
            generative: null,
            structure: null,
            eeatOnPage: { withImpressum: 0, withPrivacy: 0, totalPages: 0 },
            performance: null,
            eco: null,
        } as unknown as DomainSummaryResponse['aggregated'];

        const stored = toStoredAggregated(aggregated);
        expect(stored.issues?.pagesByIssueCount).toEqual([]);
        expect(stored.ux?.pagesByScore).toHaveLength(DOMAIN_STORED_SUMMARY_UX_LIST_CAP);
        expect(stored.ux?.brokenLinks).toHaveLength(DOMAIN_STORED_SUMMARY_UX_BROKEN_LINKS_CAP);
    });
});

describe('buildStoredDomainPayload', () => {
    it('persists capped aggregated (not full UX lists)', () => {
        const urls = Array.from({ length: 40 }, (_, i) => `https://store.test/u${i}`);
        const fullPages = urls.map((url, i) => ({
            id: `scan-${i}`,
            url,
            timestamp: 't',
            score: 80,
            device: 'desktop' as const,
            stats: { errors: 0, warnings: 0, notices: 0 },
            ux: {
                score: 70,
                cls: 0,
                readability: { grade: 'A', score: 90 },
                tapTargets: { issues: [], detailsByPage: [] },
                focusOrderByPage: [],
                brokenLinks: [],
                consoleErrorsByPage: [],
                headingHierarchy: { pagesWithMultipleH1: 0, pagesWithSkippedLevels: 0, totalPages: 1 },
                pageCount: 1,
                pagesByScore: urls.map((u) => ({ url: u, score: 70, cls: 0 })),
            },
        })) as unknown as ScanResult[];

        const out = buildStoredDomainPayload(fullPages, {
            id: 'dom-1',
            domain: 'store.test',
            timestamp: 't',
            status: 'complete',
            progress: { scanned: 40, total: 40 },
            totalPages: 40,
            score: 80,
            graph: { nodes: [], links: [] },
            systemicIssues: [],
        });

        expect(out.pages).toHaveLength(40);
        const uxScoreLen = (out.aggregated as { ux?: { pagesByScore?: unknown[] } } | undefined)?.ux?.pagesByScore
            ?.length ?? 0;
        expect(uxScoreLen).toBeLessThanOrEqual(DOMAIN_STORED_SUMMARY_UX_LIST_CAP);
    });

    it('omits SlimPage[] when omitSlimPages is true', () => {
        const fullPages: ScanResult[] = [
            {
                id: 'p1',
                url: 'https://omit.test/',
                timestamp: 't',
                score: 1,
                device: 'desktop' as const,
                stats: { errors: 0, warnings: 0, notices: 0 },
            },
        ] as ScanResult[];

        const out = buildStoredDomainPayload(
            fullPages,
            {
                id: 'dom-2',
                domain: 'omit.test',
                timestamp: 't',
                status: 'complete',
                progress: { scanned: 1, total: 1 },
                totalPages: 1,
                score: 1,
                graph: { nodes: [], links: [] },
                systemicIssues: [],
            },
            { omitSlimPages: true }
        );
        expect(out.pages).toEqual([]);
        expect(out.totalPages).toBe(1);
    });
});
