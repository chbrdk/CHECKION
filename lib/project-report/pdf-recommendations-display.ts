/**
 * Action plan recommendations — compact, non-redundant vs findings.
 */
import { isNearDuplicateText } from '@/lib/project-report/pdf-text-dedupe';
import type { PdfNarrativeFinding } from '@/lib/project-report/pdf-findings-display';

export const PDF_RECOMMENDATIONS_LIMIT = 6;

export type PdfNarrativeRecommendation = {
    title: string;
    description: string;
    priority?: number;
    category?: string;
};

function isDuplicateRecommendation(
    candidate: PdfNarrativeRecommendation,
    existing: PdfNarrativeRecommendation
): boolean {
    return (
        isNearDuplicateText(candidate.description, existing.description) ||
        isNearDuplicateText(candidate.title, existing.title)
    );
}

export function filterRecommendationsForPdf(
    recommendations: PdfNarrativeRecommendation[],
    findings: PdfNarrativeFinding[] = [],
    limit = PDF_RECOMMENDATIONS_LIMIT
): PdfNarrativeRecommendation[] {
    const selected: PdfNarrativeRecommendation[] = [];

    for (const rec of [...recommendations].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))) {
        if (findings.some((f) => isNearDuplicateText(rec.description, f.description))) continue;
        if (findings.some((f) => isNearDuplicateText(rec.title, f.title))) continue;
        if (selected.some((existing) => isDuplicateRecommendation(rec, existing))) continue;
        selected.push(rec);
        if (selected.length >= limit) break;
    }

    return selected;
}
