import { describe, it, expect } from 'vitest';
import {
    buildCompetitorScanChangeFact,
    buildCompetitorScanChangeFactsFromProjectChanges,
} from '@/lib/project-report/competitive-scan-changes';
import type { DomainScanDiffResult } from '@/lib/domain-scan-diff';

function makeDiff(overrides: Partial<DomainScanDiffResult> = {}): DomainScanDiffResult {
    return {
        currentScanId: 's2',
        previousScanId: 's1',
        lineageKey: 'k',
        currentVersion: 2,
        comparedAt: '2024-01-02T00:00:00Z',
        summary: {
            newCount: 2,
            removedCount: 0,
            unchangedCount: 10,
            likelyUpdatedCount: 1,
            totalCurrent: 13,
            totalPrevious: 11,
        },
        pages: [
            { url: 'https://rival.com/new-a', kind: 'new' },
            { url: 'https://rival.com/new-b', kind: 'new' },
            { url: 'https://rival.com/blog', kind: 'likely_updated' },
        ],
        themes: [{ themeTag: 'Pricing', themeTagKey: 'pricing', kind: 'new', current: { score: 10, pageCount: 2, maxTier: 3, avgTier: 2 } }],
        ...overrides,
    };
}

describe('buildCompetitorScanChangeFact', () => {
    it('extracts top pages and themes with highlights', () => {
        const fact = buildCompetitorScanChangeFact({
            domain: 'rival.com',
            isOwn: false,
            diff: makeDiff(),
            scannedAt: '2024-01-02',
            previousScannedAt: '2024-01-01',
        });

        expect(fact.topNewPages).toHaveLength(2);
        expect(fact.topUpdatedPages).toEqual(['https://rival.com/blog']);
        expect(fact.topNewThemes[0]?.themeTag).toBe('Pricing');
        expect(fact.highlights.some((h) => h.title.includes('new page'))).toBe(true);
    });
});

describe('buildCompetitorScanChangeFactsFromProjectChanges', () => {
    it('skips first-scan diffs and empty activity', () => {
        const facts = buildCompetitorScanChangeFactsFromProjectChanges(
            'example.com',
            {
                own: null,
                competitors: {
                    'quiet.com': makeDiff({
                        summary: {
                            newCount: 0,
                            removedCount: 0,
                            unchangedCount: 5,
                            likelyUpdatedCount: 0,
                            totalCurrent: 5,
                            totalPrevious: 5,
                        },
                        pages: [],
                        themes: [],
                    }),
                    'first.com': makeDiff({ previousScanId: null }),
                },
            },
            { competitors: {} },
        );
        expect(facts).toHaveLength(0);
    });

    it('includes competitors with meaningful changes', () => {
        const facts = buildCompetitorScanChangeFactsFromProjectChanges(
            'example.com',
            {
                own: null,
                competitors: { 'rival.com': makeDiff() },
            },
            { competitors: { 'rival.com': { current: '2024-01-02', previous: '2024-01-01' } } },
        );
        expect(facts).toHaveLength(1);
        expect(facts[0]?.domain).toBe('rival.com');
    });
});
