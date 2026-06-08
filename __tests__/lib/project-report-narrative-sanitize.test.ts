/**
 * Tests for LLM narrative sanitization.
 */
import { describe, it, expect } from 'vitest';
import {
    coercePriority,
    sanitizeNarrativeRaw,
    sanitizeSectionRaw,
    buildExecutiveSummaryFromSections,
} from '@/lib/project-report/narrative-sanitize';

describe('narrative-sanitize', () => {
    const validIds = new Set(['ev-wcag-score', 'ev-seo-score']);

    it('coerces string priority and fixes empty evidenceIds', () => {
        const result = sanitizeNarrativeRaw(
            {
                executiveSummary: 'Summary',
                findings: [
                    {
                        title: 'Gap',
                        description: 'Desc',
                        severity: 'HIGH',
                        evidenceIds: ['ev-invalid'],
                    },
                ],
                recommendations: [
                    {
                        title: 'Fix',
                        description: 'Do it',
                        priority: '2',
                        evidenceIds: [],
                    },
                ],
                riskAmpel: { wcag: 'bad', geo: 'medium', rankings: 'low' },
            },
            validIds,
            'ev-wcag-score'
        );
        expect(result.findings[0]!.evidenceIds).toEqual(['ev-wcag-score']);
        expect(result.recommendations[0]!.priority).toBe(2);
        expect(result.riskAmpel.wcag).toBe('unknown');
    });

    it('sanitizes section with missing arrays', () => {
        const section = sanitizeSectionRaw({ title: 'SEO' }, 'Fallback');
        expect(section.keyFindings).toEqual([]);
        expect(section.title).toBe('SEO');
    });

    it('builds executive from sections', () => {
        const text = buildExecutiveSummaryFromSections(
            {
                geo: {
                    title: 'GEO',
                    summary: 'GEO is improving.',
                    keyFindings: [],
                    metricsHighlighted: [],
                },
            },
            'en'
        );
        expect(text).toContain('GEO is improving');
    });

    it('coercePriority clamps invalid values', () => {
        expect(coercePriority(9)).toBe(3);
        expect(coercePriority('4')).toBe(4);
    });
});
