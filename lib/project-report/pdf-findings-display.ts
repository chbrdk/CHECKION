/**
 * PDF findings — compact, non-redundant vs executive summary.
 */
import { isNearDuplicateText } from '@/lib/project-report/pdf-text-dedupe';

export const PDF_FINDINGS_LIMIT = 4;

export type PdfNarrativeFinding = {
    title: string;
    description: string;
    severity?: string;
    evidenceIds?: string[];
};

function isDuplicateFinding(candidate: PdfNarrativeFinding, existing: PdfNarrativeFinding): boolean {
    return (
        isNearDuplicateText(candidate.description, existing.description) ||
        isNearDuplicateText(candidate.title, existing.title) ||
        isNearDuplicateText(`${candidate.title} ${candidate.description}`, existing.description)
    );
}

export function filterFindingsForPdf(
    findings: PdfNarrativeFinding[],
    executiveSummary?: string | null,
    limit = PDF_FINDINGS_LIMIT
): PdfNarrativeFinding[] {
    const exec = executiveSummary?.trim() ?? '';
    const selected: PdfNarrativeFinding[] = [];

    for (const finding of findings) {
        if (exec && isNearDuplicateText(finding.description, exec)) continue;
        if (exec && isNearDuplicateText(finding.title, exec)) continue;
        if (selected.some((existing) => isDuplicateFinding(finding, existing))) continue;
        selected.push(finding);
        if (selected.length >= limit) break;
    }

    return selected;
}
