import { describe, expect, it } from 'vitest';
import {
    domainAggregatedMessageAndCodeWidths,
    estimateDomainAggregatedRowHeights,
    estimateScanIssueListRowHeights,
    scanIssueListMessageAndCodeWidths,
} from '@/lib/pretext-issue-row-heights';
import {
    DOMAIN_AGGREGATED_ISSUES_ROW_ESTIMATE_PX,
    SCAN_ISSUE_LIST_ROW_FALLBACK_PX,
} from '@/lib/constants';

describe('scanIssueListMessageAndCodeWidths', () => {
    it('distributes fr tracks after fixed px columns', () => {
        const w = 800;
        const flex = w - (80 + 72 + 40);
        const frUnit = flex / (1 + 1.2 + 1);
        const { message, code } = scanIssueListMessageAndCodeWidths(w);
        expect(message).toBe(Math.max(48, 1.2 * frUnit - 24));
        expect(code).toBe(Math.max(32, 1 * frUnit - 24));
    });

    it('returns sensible mins for very narrow containers', () => {
        const { message, code } = scanIssueListMessageAndCodeWidths(100);
        expect(message).toBe(48);
        expect(code).toBe(32);
    });
});

describe('domainAggregatedMessageAndCodeWidths', () => {
    it('matches domain aggregated grid fr ratio', () => {
        const w = 900;
        const flex = w - (70 + 80 + 72 + 92 + 48);
        const frUnit = flex / (1.2 + 1);
        const { message, code } = domainAggregatedMessageAndCodeWidths(w);
        expect(message).toBe(Math.max(48, 1.2 * frUnit - 16));
        expect(code).toBe(Math.max(32, 1 * frUnit - 16));
    });
});

describe('pretext row height estimates (Node: canvas unavailable)', () => {
    it('estimateScanIssueListRowHeights uses fallback without canvas', () => {
        const issues = [
            { code: 'x', type: 'error' as const, message: 'a'.repeat(200), context: '', selector: '', runner: 'axe' as const, wcagLevel: 'AA' as const },
        ];
        const heights = estimateScanIssueListRowHeights(issues, 800);
        expect(heights).toEqual([SCAN_ISSUE_LIST_ROW_FALLBACK_PX]);
    });

    it('estimateDomainAggregatedRowHeights uses fallback without canvas', () => {
        const issues = [
            { code: 'y', type: 'warning' as const, message: 'b'.repeat(200), context: '', selector: '', runner: 'htmlcs' as const, wcagLevel: 'A' as const },
        ];
        const heights = estimateDomainAggregatedRowHeights(issues, 800);
        expect(heights).toEqual([DOMAIN_AGGREGATED_ISSUES_ROW_ESTIMATE_PX]);
    });

    it('uses fallback when container width is zero', () => {
        const issues = [
            { code: 'z', type: 'notice' as const, message: 'hi', context: '', selector: '', runner: 'axe' as const, wcagLevel: 'Unknown' as const },
        ];
        expect(estimateScanIssueListRowHeights(issues, 0)).toEqual([SCAN_ISSUE_LIST_ROW_FALLBACK_PX]);
    });
});
