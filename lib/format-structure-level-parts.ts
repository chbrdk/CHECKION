/**
 * Compact heading level counts for the structure summary line (H1:n · H2:n …).
 */
export function formatStructureLevelParts(counts: Record<number, number>): string {
    return [1, 2, 3, 4, 5, 6]
        .filter((l) => (counts[l] ?? 0) > 0)
        .map((l) => `H${l}:${counts[l] ?? 0}`)
        .join(' · ');
}
