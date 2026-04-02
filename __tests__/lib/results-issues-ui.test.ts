import { describe, expect, it } from 'vitest';
import { resultsIssuesOneBasedPageForFilteredIndex } from '@/lib/results-issues-ui';

describe('resultsIssuesOneBasedPageForFilteredIndex', () => {
    it('returns 1 for first page indices and correct page after each pageSize', () => {
        expect(resultsIssuesOneBasedPageForFilteredIndex(0, 50)).toBe(1);
        expect(resultsIssuesOneBasedPageForFilteredIndex(49, 50)).toBe(1);
        expect(resultsIssuesOneBasedPageForFilteredIndex(50, 50)).toBe(2);
        expect(resultsIssuesOneBasedPageForFilteredIndex(99, 50)).toBe(2);
        expect(resultsIssuesOneBasedPageForFilteredIndex(100, 50)).toBe(3);
    });

    it('handles edge cases', () => {
        expect(resultsIssuesOneBasedPageForFilteredIndex(-1, 50)).toBe(1);
        expect(resultsIssuesOneBasedPageForFilteredIndex(5, 0)).toBe(1);
    });
});
