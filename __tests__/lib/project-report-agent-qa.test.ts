/**
 * Tests for narrative evidence QA validation.
 */
import { describe, it, expect } from 'vitest';
import { validateNarrativeEvidence } from '@/lib/project-report/agent-qa';
import type { ProjectReportNarrative } from '@/lib/project-report/narrative-schema';
import type { ProvenanceEntry } from '@/lib/project-report/types';

describe('validateNarrativeEvidence', () => {
    const provenance: ProvenanceEntry[] = [
        { evidenceId: 'ev-wcag-score', source: 'domain-scan', label: 'WCAG', value: 72 },
    ];

    it('drops recommendations with invalid evidence IDs', () => {
        const narrative: ProjectReportNarrative = {
            executiveSummary: 'Test',
            findings: [
                {
                    title: 'Valid',
                    description: 'Ok',
                    evidenceIds: ['ev-wcag-score'],
                },
                {
                    title: 'Invalid',
                    description: 'Bad',
                    evidenceIds: ['ev-fake-id'],
                },
            ],
            recommendations: [
                {
                    title: 'Keep',
                    description: 'Ok',
                    priority: 1,
                    evidenceIds: ['ev-wcag-score'],
                },
                {
                    title: 'Drop',
                    description: 'Bad',
                    priority: 2,
                    evidenceIds: ['ev-not-real'],
                },
            ],
            riskAmpel: { wcag: 'medium', geo: 'unknown', rankings: 'unknown' },
        };

        const result = validateNarrativeEvidence(narrative, provenance);
        expect(result.findings).toHaveLength(1);
        expect(result.findings[0]!.title).toBe('Valid');
        expect(result.recommendations).toHaveLength(1);
        expect(result.recommendations[0]!.title).toBe('Keep');
    });
});
