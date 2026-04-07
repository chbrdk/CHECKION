import { describe, expect, it } from 'vitest';
import { aggregateUx } from '@/lib/domain-aggregation';
import type { ScanResult } from '@/lib/types';

const baseUx: NonNullable<ScanResult['ux']> = {
    score: 70,
    cls: 0,
    readability: { grade: 'Easy (6th Grade)', score: 5 },
    tapTargets: { issues: [], details: [] },
    viewport: { isMobileFriendly: true, issues: [] },
    consoleErrors: [],
    brokenLinks: [],
    focusOrder: [],
};

function page(url: string, ux: Partial<NonNullable<ScanResult['ux']>>): ScanResult {
    return {
        id: url,
        url,
        timestamp: 't',
        score: 70,
        device: 'desktop',
        stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
        issues: [],
        ux: { ...baseUx, ...ux },
    } as ScanResult;
}

/** Page with UX payload but no readability block (treated like missing score in aggregation). */
function pageWithoutReadability(url: string): ScanResult {
    const ux = { ...baseUx } as Record<string, unknown>;
    delete ux.readability;
    return {
        id: url,
        url,
        timestamp: 't',
        score: 70,
        device: 'desktop',
        stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
        issues: [],
        ux: ux as NonNullable<ScanResult['ux']>,
    } as ScanResult;
}

describe('aggregateUx readability', () => {
    it('averages grade level only over pages with readability.score', () => {
        const out = aggregateUx([
            page('https://ex.test/a', { readability: { grade: 'Easy (6th Grade)', score: 4 } }),
            page('https://ex.test/b', { readability: { grade: 'Complex (College)', score: 12 } }),
            pageWithoutReadability('https://ex.test/c'),
        ]);
        expect(out).not.toBeNull();
        expect(out!.readability.pagesWithReadability).toBe(2);
        expect(out!.readability.score).toBe(8);
        expect(out!.readability.minScore).toBe(4);
        expect(out!.readability.maxScore).toBe(12);
        expect(out!.readability.grade).toBe('Standard (High School)');
        expect(out!.readability.bandCounts.easy).toBe(1);
        expect(out!.readability.bandCounts.complex).toBe(1);
        expect(out!.readability.bandCounts.standard).toBe(0);
        expect(out!.readability.bandCounts.veryComplex).toBe(0);
    });

    it('lists hardest pages by score descending', () => {
        const out = aggregateUx([
            page('https://ex.test/low', { readability: { grade: 'Easy (6th Grade)', score: 3 } }),
            page('https://ex.test/high', { readability: { grade: 'Very Complex (Academic)', score: 16 } }),
            page('https://ex.test/mid', { readability: { grade: 'Standard (High School)', score: 8 } }),
        ]);
        expect(out!.readability.hardestPages.map((p) => p.url)).toEqual([
            'https://ex.test/high',
            'https://ex.test/mid',
            'https://ex.test/low',
        ]);
        expect(out!.readability.hardestPages[0].score).toBe(16);
    });
});
