/* ------------------------------------------------------------------ */
/*  CHECKION – Detect bot/placeholder pages after navigation          */
/* ------------------------------------------------------------------ */

export type ScanPageQualityCode = 'placeholder_page' | 'thin_content';

export interface ScanPageQualityProbe {
    title: string;
    bodyText: string;
    linkCount: number;
    wordCount: number;
}

export interface ScanPageQualityIssue {
    code: ScanPageQualityCode;
    /** Human-readable explanation (German for UI consistency). */
    message: string;
}

const PLACEHOLDER_PATTERNS = [
    /\bunder\s+construction\b/i,
    /\bunder\s+maintenance\b/i,
    /\bthis\s+site\s+is\s+under\s+maintenance\b/i,
    /\bcoming\s+soon\b/i,
    /\bmaintenance\s+mode\b/i,
    /\bwebsite\s+coming\s+soon\b/i,
    /\bim\s+bau\b/i,
    /\bseite\s+in\s+bearbeitung\b/i,
    /\bwartungsmodus\b/i,
];

/** Title-only maintenance pages (e.g. exyte.net bot wall). */
const PLACEHOLDER_TITLE_ONLY = /^(maintenance|coming\s+soon|under\s+construction|wartung)$/i;

function countWords(text: string): number {
    const trimmed = text.replace(/\s+/g, ' ').trim();
    if (!trimmed) return 0;
    return trimmed.split(' ').filter(Boolean).length;
}

export function probeMatchesPlaceholder(probe: ScanPageQualityProbe): boolean {
    const haystack = `${probe.title}\n${probe.bodyText}`.trim();
    if (PLACEHOLDER_PATTERNS.some((re) => re.test(haystack))) return true;
    if (PLACEHOLDER_TITLE_ONLY.test(probe.title.trim()) && probe.wordCount < 80) return true;
    return false;
}

export function probeIsThinContent(probe: ScanPageQualityProbe): boolean {
    return probe.wordCount < 50 && probe.linkCount < 3;
}

/**
 * Returns quality issues when the loaded document looks like a bot wall or empty shell.
 * Does not throw; safe to call after navigation.
 */
export function detectScanPageQuality(probe: ScanPageQualityProbe): ScanPageQualityIssue[] {
    const issues: ScanPageQualityIssue[] = [];
    if (probeMatchesPlaceholder(probe)) {
        issues.push({
            code: 'placeholder_page',
            message:
                'Die geladene Seite wirkt wie eine Wartungs- oder Platzhalterseite (z. B. Bot-Schutz). WCAG- und SEO-Werte können irreführend gut sein.',
        });
    } else if (probeIsThinContent(probe)) {
        issues.push({
            code: 'thin_content',
            message:
                'Sehr wenig sichtbarer Inhalt (< 50 Wörter, kaum Links). Möglicherweise unvollständig geladen oder blockiert.',
        });
    }
    return issues;
}

export function buildScanPageQualityProbe(input: {
    title: string;
    bodyText: string;
    linkCount: number;
}): ScanPageQualityProbe {
    const bodyText = input.bodyText.replace(/\s+/g, ' ').trim();
    return {
        title: input.title.trim(),
        bodyText,
        linkCount: input.linkCount,
        wordCount: countWords(bodyText),
    };
}
