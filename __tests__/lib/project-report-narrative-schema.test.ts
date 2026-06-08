/**
 * Tests for project report narrative Zod schema.
 */
import { describe, it, expect } from 'vitest';
import { ProjectReportNarrativeSchema } from '@/lib/project-report/narrative-schema';

describe('ProjectReportNarrativeSchema', () => {
    it('parses valid narrative', () => {
        const parsed = ProjectReportNarrativeSchema.parse({
            executiveSummary: 'Summary text.',
            findings: [
                {
                    title: 'WCAG gaps',
                    description: 'Many errors.',
                    severity: 'high',
                    evidenceIds: ['ev-wcag-score'],
                },
            ],
            recommendations: [
                {
                    title: 'Fix headings',
                    description: 'Improve structure.',
                    priority: 1,
                    evidenceIds: ['ev-wcag-errors'],
                },
            ],
            riskAmpel: { wcag: 'high', geo: 'medium', rankings: 'low' },
        });
        expect(parsed.executiveSummary).toContain('Summary');
        expect(parsed.findings).toHaveLength(1);
    });

    it('rejects recommendation without evidenceIds', () => {
        expect(() =>
            ProjectReportNarrativeSchema.parse({
                executiveSummary: 'x',
                findings: [],
                recommendations: [{ title: 'a', description: 'b', priority: 1, evidenceIds: [] }],
                riskAmpel: { wcag: 'unknown', geo: 'unknown', rankings: 'unknown' },
            })
        ).toThrow();
    });
});
