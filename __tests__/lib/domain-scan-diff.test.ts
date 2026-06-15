import { describe, it, expect } from 'vitest';
import { buildDomainScanDiff, normalizeDiffUrl } from '@/lib/domain-scan-diff';
import type { DomainPageDiffInput } from '@/lib/domain-scan-diff';

const baseParams = {
    currentScanId: 'scan-2',
    previousScanId: 'scan-1' as string | null,
    lineageKey: 'user||example.com',
    currentVersion: 2,
};

describe('normalizeDiffUrl', () => {
    it('strips trailing slash from path', () => {
        expect(normalizeDiffUrl('https://example.com/page/')).toBe('https://example.com/page');
    });
});

describe('buildDomainScanDiff', () => {
    it('marks all pages as new when no previous scan', () => {
        const current: DomainPageDiffInput[] = [
            { url: 'https://example.com/a' },
            { url: 'https://example.com/b' },
        ];
        const diff = buildDomainScanDiff({
            ...baseParams,
            previousScanId: null,
            currentPages: current,
            previousPages: [],
        });
        expect(diff.summary.newCount).toBe(2);
        expect(diff.summary.removedCount).toBe(0);
        expect(diff.pages.every((p) => p.kind === 'new')).toBe(true);
    });

    it('detects new, removed, unchanged, and likely_updated pages', () => {
        const current: DomainPageDiffInput[] = [
            { url: 'https://example.com/unchanged', reusedUnchanged: true },
            {
                url: 'https://example.com/updated',
                documentCacheHints: { etag: '"v2"' },
            },
            { url: 'https://example.com/new-page' },
        ];
        const previous: DomainPageDiffInput[] = [
            { url: 'https://example.com/unchanged', reusedUnchanged: true },
            {
                url: 'https://example.com/updated',
                documentCacheHints: { etag: '"v1"' },
            },
            { url: 'https://example.com/removed' },
        ];

        const diff = buildDomainScanDiff({
            ...baseParams,
            currentPages: current,
            previousPages: previous,
        });

        expect(diff.summary).toMatchObject({
            newCount: 1,
            removedCount: 1,
            unchangedCount: 1,
            likelyUpdatedCount: 1,
            totalCurrent: 3,
            totalPrevious: 3,
        });

        const byUrl = Object.fromEntries(diff.pages.map((p) => [p.url, p.kind]));
        expect(byUrl['https://example.com/new-page']).toBe('new');
        expect(byUrl['https://example.com/removed']).toBe('removed');
        expect(byUrl['https://example.com/unchanged']).toBe('unchanged');
        expect(byUrl['https://example.com/updated']).toBe('likely_updated');
    });

    it('treats matching headers as unchanged when not reused', () => {
        const hints = { etag: '"same"', lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT' };
        const current: DomainPageDiffInput[] = [{ url: 'https://example.com/x', documentCacheHints: hints }];
        const previous: DomainPageDiffInput[] = [{ url: 'https://example.com/x', documentCacheHints: hints }];

        const diff = buildDomainScanDiff({
            ...baseParams,
            currentPages: current,
            previousPages: previous,
        });

        expect(diff.summary.unchangedCount).toBe(1);
        expect(diff.summary.likelyUpdatedCount).toBe(0);
    });

    it('normalizes URLs with trailing slashes', () => {
        const current: DomainPageDiffInput[] = [{ url: 'https://example.com/page/', reusedUnchanged: true }];
        const previous: DomainPageDiffInput[] = [{ url: 'https://example.com/page', reusedUnchanged: true }];

        const diff = buildDomainScanDiff({
            ...baseParams,
            currentPages: current,
            previousPages: previous,
        });

        expect(diff.summary.unchangedCount).toBe(1);
    });
});
