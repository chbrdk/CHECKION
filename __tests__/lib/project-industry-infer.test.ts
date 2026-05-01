import { describe, it, expect } from 'vitest';
import { parseIndustryInferResponse, buildThemesForIndustryInfer } from '@/lib/llm/project-industry-infer';
import type { AggregatedPageClassification } from '@/lib/types';

describe('parseIndustryInferResponse', () => {
    it('parses industryId from JSON object', () => {
        expect(parseIndustryInferResponse('{"industryId":"healthcare_medical"}')).toBe('healthcare_medical');
    });

    it('parses fenced markdown block', () => {
        expect(parseIndustryInferResponse('```json\n{"industryId":"media_marketing_agency"}\n```')).toBe(
            'media_marketing_agency'
        );
    });

    it('returns null for empty or null industryId', () => {
        expect(parseIndustryInferResponse('{"industryId":""}')).toBeNull();
        expect(parseIndustryInferResponse('{"industryId":null}')).toBeNull();
    });

    it('returns null for invalid id', () => {
        expect(parseIndustryInferResponse('{"industryId":"made_up_sector"}')).toBeNull();
    });

    it('returns null for legacy industry key', () => {
        expect(parseIndustryInferResponse('{"industry":"Healthcare SaaS"}')).toBeNull();
    });

    it('returns null for invalid JSON', () => {
        expect(parseIndustryInferResponse('not json')).toBeNull();
    });
});

describe('buildThemesForIndustryInfer', () => {
    it('maps topThemes with cap', () => {
        const pc: AggregatedPageClassification = {
            topThemes: [
                { tag: 'A', score: 10, pageCount: 3, maxTier: 4, relatedPages: [] },
                { tag: 'B', score: 5, pageCount: 2, maxTier: 3, relatedPages: [] },
            ],
        };
        expect(buildThemesForIndustryInfer(pc, 5)).toEqual([
            { tag: 'A', score: 10, pageCount: 3 },
            { tag: 'B', score: 5, pageCount: 2 },
        ]);
    });

    it('returns empty when missing', () => {
        expect(buildThemesForIndustryInfer(undefined, 5)).toEqual([]);
    });
});
