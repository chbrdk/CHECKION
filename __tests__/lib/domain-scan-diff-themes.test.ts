import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/domain-scan-lineage-queries', () => ({
    getDomainScanAggregatedPageClassification: vi.fn(),
}));

import { getDomainScanAggregatedPageClassification } from '@/lib/db/domain-scan-lineage-queries';
import { buildDomainScanThemeDiff } from '@/lib/domain-scan-diff-themes';
import type { DomainPageDiffInput } from '@/lib/domain-scan-diff';

describe('buildDomainScanThemeDiff', () => {
    beforeEach(() => {
        vi.mocked(getDomainScanAggregatedPageClassification).mockReset();
    });

    it('detects new and removed aggregated themes', async () => {
        vi.mocked(getDomainScanAggregatedPageClassification)
            .mockResolvedValueOnce({
                topThemes: [
                    { tag: 'Pricing', score: 20, pageCount: 2, maxTier: 4, avgTier: 3 },
                    { tag: 'Enterprise', score: 10, pageCount: 1, maxTier: 3, avgTier: 3 },
                ],
            })
            .mockResolvedValueOnce({
                topThemes: [{ tag: 'Pricing', score: 15, pageCount: 1, maxTier: 3, avgTier: 3 }],
            });

        const themes = await buildDomainScanThemeDiff({
            userId: 'u1',
            currentScanId: 's2',
            previousScanId: 's1',
            currentPages: [],
            previousPages: [],
        });

        const kinds = Object.fromEntries(themes.map((t) => [t.themeTagKey, t.kind]));
        expect(kinds.enterprise).toBe('new');
        expect(kinds.pricing).toBe('tier_changed');
    });

    it('links new page URLs to theme when per-page classification differs', async () => {
        vi.mocked(getDomainScanAggregatedPageClassification)
            .mockResolvedValueOnce({
                topThemes: [{ tag: 'Blog', themeTagKey: 'blog', score: 5, pageCount: 1, maxTier: 2, avgTier: 2 }],
            })
            .mockResolvedValueOnce({ topThemes: [] });

        const currentPages: DomainPageDiffInput[] = [
            { url: 'https://ex.com/post', pageClassification: { primaryTag: 'Blog', tier: 2 } },
        ];
        const previousPages: DomainPageDiffInput[] = [];

        const themes = await buildDomainScanThemeDiff({
            userId: 'u1',
            currentScanId: 's2',
            previousScanId: 's1',
            currentPages,
            previousPages,
        });

        expect(themes[0]?.kind).toBe('new');
        expect(themes[0]?.newPageUrls).toContain('https://ex.com/post');
    });
});
