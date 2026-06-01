/**
 * OpenAI Structured Outputs require required fields + .nullable() (not .optional()).
 */
import { describe, it, expect } from 'vitest';
import { zodResponseFormat } from 'openai/helpers/zod';
import { projectResearchResultSchema } from '@/lib/research/schema';

describe('projectResearchResultSchema', () => {
    it('is compatible with zodResponseFormat (no optional-only fields)', () => {
        expect(() => zodResponseFormat(projectResearchResultSchema, 'project_research')).not.toThrow();
    });

    it('accepts null for market-keyed optional fields', () => {
        const parsed = projectResearchResultSchema.safeParse({
            targetGroups: ['A'],
            valueProposition: null,
            seoKeywords: ['kw'],
            seoKeywordsByMarket: null,
            geoQueries: ['q'],
            geoQueriesByMarket: null,
            competitors: ['c.com'],
            marketKeys: null,
        });
        expect(parsed.success).toBe(true);
    });
});
