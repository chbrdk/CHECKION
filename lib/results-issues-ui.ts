/** UI helpers for scan results issue list (pagination + scroll alignment). */

export function resultsIssuesOneBasedPageForFilteredIndex(filteredIndex: number, pageSize: number): number {
    if (pageSize <= 0) return 1;
    if (filteredIndex < 0) return 1;
    return Math.floor(filteredIndex / pageSize) + 1;
}
