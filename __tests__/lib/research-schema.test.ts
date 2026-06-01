/**
 * OpenAI Structured Outputs: required fields + .nullable(), no z.record() (propertyNames).
 */
import { describe, it, expect } from 'vitest';
import { zodResponseFormat } from 'openai/helpers/zod';
import {
    marketEntriesToRecord,
    normalizeResearchResult,
    projectResearchOpenAISchema,
    projectResearchResultSchema,
} from '@/lib/research/schema';

describe('projectResearchOpenAISchema', () => {
    it('is compatible with zodResponseFormat (no record / propertyNames)', () => {
        expect(() => zodResponseFormat(projectResearchOpenAISchema, 'project_research')).not.toThrow();
    });

    it('accepts null for market-keyed list fields', () => {
        const parsed = projectResearchOpenAISchema.safeParse({
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

describe('normalizeResearchResult', () => {
    it('converts market entry arrays to records for API', () => {
        const api = normalizeResearchResult(
            {
                targetGroups: ['A'],
                valueProposition: null,
                seoKeywords: ['fallback'],
                seoKeywordsByMarket: [
                    { marketKey: 'de-de', items: ['de kw'] },
                    { marketKey: 'us-en', items: ['us kw'] },
                ],
                geoQueries: ['q'],
                geoQueriesByMarket: null,
                competitors: ['c.com'],
                marketKeys: ['de-de', 'us-en'],
            },
            ['de-de']
        );
        expect(api.seoKeywordsByMarket).toEqual({ 'de-de': ['de kw'], 'us-en': ['us kw'] });
        expect(api.seoKeywords).toEqual(['de kw']);
        expect(projectResearchResultSchema.safeParse(api).success).toBe(true);
    });
});

describe('marketEntriesToRecord', () => {
    it('lowercases market keys', () => {
        expect(
            marketEntriesToRecord([{ marketKey: 'US-EN', items: ['x'] }])
        ).toEqual({ 'us-en': ['x'] });
    });
});
