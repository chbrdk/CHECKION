/**
 * Bulk DB reads strip `passes`; aggregation must still work (uses `issues`, not `passes`).
 */
import { describe, it, expect } from 'vitest';
import { aggregateIssues } from '@/lib/domain-aggregation';
import type { ScanResult } from '@/lib/types';

function minimalPage(overrides: Partial<ScanResult>): ScanResult {
    return {
        id: 'x',
        url: 'https://example.com/',
        timestamp: 't',
        standard: 'WCAG2AA',
        device: 'desktop',
        runners: ['axe'],
        issues: [],
        passes: [],
        stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
        durationMs: 1,
        score: 50,
        screenshot: '',
        ...overrides,
    };
}

describe('aggregation without passes (bulk-read shape)', () => {
    it('aggregateIssues uses issues array only', () => {
        const pages: ScanResult[] = [
            minimalPage({
                url: 'https://a.com/',
                issues: [
                    {
                        code: 'c1',
                        type: 'error',
                        message: 'm',
                        context: '',
                        selector: 'body',
                        runner: 'axe',
                        wcagLevel: 'A',
                    },
                ],
                stats: { errors: 1, warnings: 0, notices: 0, total: 1 },
            }),
        ];
        const agg = aggregateIssues(pages);
        expect(agg.issues.length).toBe(1);
        expect(agg.issues[0]!.pageCount).toBe(1);
    });
});
