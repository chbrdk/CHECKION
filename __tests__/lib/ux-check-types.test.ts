/**
 * Tests for UX Check v2 types and Zod schemas.
 */

import { describe, it, expect } from 'vitest';
import {
    UxCheckProblemSchema,
    UxCheckStructuredSchema,
    UxCheckV2SummarySchema,
    isUxCheckV2Summary,
} from '@/lib/ux-check-types';

describe('ux-check-types', () => {
    it('parses a valid problem', () => {
        const p = UxCheckProblemSchema.parse({
            title: 'Navigation unklar',
            befund: ['Punkt 1', 'Punkt 2', 'Punkt 3'],
            empfehlung: ['Maßnahme 1', 'Maßnahme 2', 'Maßnahme 3'],
            heuristik: 'D2 — Selbstbeschreibungsfähigkeit',
            severity: 'Mittel',
        });
        expect(p.title).toBe('Navigation unklar');
        expect(p.severity).toBe('Mittel');
    });

    it('parses minimal structured payload', () => {
        const s = UxCheckStructuredSchema.parse({
            problems: [],
            positiveAspects: [],
            ratingTable: [],
            impactEffortMatrix: [],
            recommendations: [],
        });
        expect(s.problems).toEqual([]);
        expect(s.recommendations).toEqual([]);
    });

    it('parses full structured payload with header and one problem', () => {
        const s = UxCheckStructuredSchema.parse({
            header: { seitenTitel: 'Home', url: 'https://example.com', analysdatum: '2025-03-13' },
            problems: [{
                title: 'CTA zu klein',
                befund: ['a', 'b', 'c'],
                empfehlung: ['x', 'y', 'z'],
                heuristik: 'E1 — Wahrnehmungssteuerung',
                severity: 'Gering',
            }],
            positiveAspects: ['Klares Layout'],
            ratingTable: [{ kategorie: 'Usability', unterkategorien: 'A11y', score: 4, begruendung: 'Gut' }],
            impactEffortMatrix: [{ problem: 'CTA zu klein', impact: 'Mittel', effort: 'Gering', prioritaet: 'Quick Win' }],
            recommendations: ['CTA vergrößern'],
        });
        expect(s.header?.url).toBe('https://example.com');
        expect(s.problems).toHaveLength(1);
        expect(s.problems[0].severity).toBe('Gering');
        expect(s.ratingTable[0].score).toBe(4);
    });

    it('rejects invalid severity', () => {
        expect(() =>
            UxCheckProblemSchema.parse({
                title: 'X',
                befund: ['a'],
                empfehlung: ['b'],
                heuristik: 'D1',
                severity: 'Invalid',
            })
        ).toThrow();
    });

    it('isUxCheckV2Summary returns true for v2 object', () => {
        const v2 = {
            version: 'ux-check-v2',
            structured: { problems: [], positiveAspects: [], ratingTable: [], impactEffortMatrix: [], recommendations: [] },
            modelUsed: 'claude-sonnet-4',
            generatedAt: new Date().toISOString(),
        };
        expect(isUxCheckV2Summary(v2)).toBe(true);
    });

    it('isUxCheckV2Summary returns false for old summary', () => {
        expect(isUxCheckV2Summary({ summary: 'x', themes: [], recommendations: [], modelUsed: 'gpt', generatedAt: '' })).toBe(false);
        expect(isUxCheckV2Summary(null)).toBe(false);
    });

    it('UxCheckV2SummarySchema accepts valid full summary', () => {
        const summary = {
            version: 'ux-check-v2',
            structured: {
                header: { url: 'https://test.de' },
                problems: [],
                positiveAspects: [],
                ratingTable: [],
                impactEffortMatrix: [],
                recommendations: [],
            },
            modelUsed: 'claude-sonnet-4',
            generatedAt: new Date().toISOString(),
        };
        const parsed = UxCheckV2SummarySchema.parse(summary);
        expect(parsed.version).toBe('ux-check-v2');
        expect(parsed.structured.header?.url).toBe('https://test.de');
    });
});
