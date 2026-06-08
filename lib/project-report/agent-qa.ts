/**
 * QA validation for agent narrative — drop items with invalid evidence IDs.
 */

import type { ProvenanceEntry } from '@/lib/project-report/types';
import type {
    ProjectReportFinding,
    ProjectReportNarrative,
    ProjectReportRecommendation,
} from '@/lib/project-report/narrative-schema';

function filterByEvidence<T extends { evidenceIds: string[] }>(
    items: T[],
    validIds: Set<string>
): T[] {
    return items.filter((item) =>
        item.evidenceIds.length > 0 && item.evidenceIds.every((id) => validIds.has(id))
    );
}

export function validateNarrativeEvidence(
    narrative: ProjectReportNarrative,
    provenance: ProvenanceEntry[]
): ProjectReportNarrative {
    const validIds = new Set(provenance.map((p) => p.evidenceId));
    const findings = filterByEvidence(narrative.findings as ProjectReportFinding[], validIds);
    const recommendations = filterByEvidence(
        narrative.recommendations as ProjectReportRecommendation[],
        validIds
    );
    return {
        ...narrative,
        findings,
        recommendations,
    };
}

export function buildEvidenceIdSet(provenance: ProvenanceEntry[]): Set<string> {
    return new Set(provenance.map((p) => p.evidenceId));
}
