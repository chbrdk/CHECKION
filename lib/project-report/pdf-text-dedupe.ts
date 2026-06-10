/**
 * Drop near-duplicate interpretation paragraphs before PDF render.
 */
function normalize(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function significantWords(text: string): Set<string> {
    return new Set(
        normalize(text)
            .split(' ')
            .filter((word) => word.length > 3)
    );
}

function wordOverlapRatio(a: string, b: string): number {
    const wordsA = significantWords(a);
    const wordsB = significantWords(b);
    if (wordsA.size === 0 || wordsB.size === 0) return 0;
    let overlap = 0;
    for (const word of wordsA) {
        if (wordsB.has(word)) overlap += 1;
    }
    return overlap / Math.min(wordsA.size, wordsB.size);
}

export function isNearDuplicateText(a: string, b: string): boolean {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    const shorter = na.length <= nb.length ? na : nb;
    const longer = na.length <= nb.length ? nb : na;
    if (shorter.length >= 48 && longer.includes(shorter.slice(0, Math.min(96, shorter.length)))) {
        return true;
    }
    return wordOverlapRatio(a, b) >= 0.62;
}

export function dedupeInterpretationTexts(texts: string[]): string[] {
    const out: string[] = [];
    for (const raw of texts) {
        const text = raw.trim();
        if (!text) continue;
        if (out.some((existing) => isNearDuplicateText(existing, text))) continue;
        out.push(text);
    }
    return out;
}
