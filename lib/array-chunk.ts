/**
 * Split an array into consecutive chunks of at most `size` elements (last chunk may be smaller).
 */
export function chunkArray<T>(arr: T[], size: number): T[][] {
    if (arr.length === 0 || size <= 0) return [];
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}
