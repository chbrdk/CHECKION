/**
 * Unit tests: page classification LLM response parsing.
 */
import { describe, it, expect } from 'vitest';
import {
    parseClassificationResponse,
    extractJsonFromResponse,
    buildClassificationPayload,
} from '@/lib/llm/page-classification';
import type { ScanResult } from '@/lib/types';

describe('parseClassificationResponse', () => {
    it('parses new format tagTiers with shortSummary', () => {
        const raw = JSON.stringify({
            tagTiers: [
                { tag: 'Pumpen', tier: 5 },
                { tag: 'Technische Daten', tier: 5 },
                { tag: 'Kontakt', tier: 2 },
            ],
            shortSummary: 'Produktseite zu Pumpen mit technischen Daten.',
        });
        const result = parseClassificationResponse(raw);
        expect(result.tagTiers).toEqual([
            { tag: 'Pumpen', tier: 5 },
            { tag: 'Technische Daten', tier: 5 },
            { tag: 'Kontakt', tier: 2 },
        ]);
        expect(result.shortSummary).toBe('Produktseite zu Pumpen mit technischen Daten.');
    });

    it('parses legacy format (tags + tier) into tagTiers', () => {
        const raw = JSON.stringify({ tags: ['Pumpen', 'Technische Daten'], tier: 5, shortSummary: 'Ok.' });
        const result = parseClassificationResponse(raw);
        expect(result.tagTiers).toEqual([
            { tag: 'Pumpen', tier: 5 },
            { tag: 'Technische Daten', tier: 5 },
        ]);
        expect(result.shortSummary).toBe('Ok.');
    });

    it('parses legacy format without shortSummary', () => {
        const raw = JSON.stringify({ tags: ['Kontakt'], tier: 4 });
        const result = parseClassificationResponse(raw);
        expect(result.tagTiers).toEqual([{ tag: 'Kontakt', tier: 4 }]);
        expect(result.shortSummary).toBeUndefined();
    });

    it('returns fallback (empty tagTiers) for empty content', () => {
        const result = parseClassificationResponse('');
        expect(result.tagTiers).toEqual([]);
    });

    it('returns fallback for invalid JSON', () => {
        const result = parseClassificationResponse('not json at all');
        expect(result.tagTiers).toEqual([]);
    });

    it('returns fallback for invalid tier in legacy (schema fails, default fallback)', () => {
        const raw = JSON.stringify({ tags: ['A'], tier: 99 });
        const result = parseClassificationResponse(raw);
        expect(result.tagTiers).toEqual([]);
    });

    it('trims tags and filters empty in new format', () => {
        const raw = JSON.stringify({
            tagTiers: [{ tag: '  X  ', tier: 1 }, { tag: '', tier: 2 }, { tag: 'Y', tier: 2 }],
        });
        const result = parseClassificationResponse(raw);
        expect(result.tagTiers).toEqual([{ tag: 'X', tier: 1 }, { tag: 'Y', tier: 2 }]);
    });
});

describe('extractJsonFromResponse', () => {
    it('extracts JSON from markdown code block', () => {
        const content = '```json\n{"tagTiers":[{"tag":"X","tier":1}]}\n```';
        const out = extractJsonFromResponse(content);
        expect(out).toBe('{"tagTiers":[{"tag":"X","tier":1}]}');
    });

    it('returns trimmed content when no code block', () => {
        const content = '  {"tagTiers":[{"tag":"Y","tier":2}]}  ';
        const out = extractJsonFromResponse(content);
        expect(out).toBe('{"tagTiers":[{"tag":"Y","tier":2}]}');
    });
});

describe('buildClassificationPayload', () => {
    it('builds payload from ScanResult with bodyTextExcerpt and seo', () => {
        const result: ScanResult = {
            id: 's1',
            url: 'https://example.com/page',
            timestamp: '',
            standard: 'WCAG2AA',
            device: 'desktop',
            runners: [],
            issues: [],
            passes: [],
            stats: { errors: 0, warnings: 0, notices: 0 },
            durationMs: 0,
            score: 90,
            screenshot: '',
            performance: { ttfb: 0, fcp: 0, domLoad: 0, windowLoad: 0, lcp: 0 },
            eco: { co2: 0, grade: 'A', pageWeight: 0 },
            bodyTextExcerpt: 'A'.repeat(3000),
            seo: {
                title: 'Example Page',
                h1: 'Example H1',
                metaDescription: 'Short meta.',
            },
        } as ScanResult;
        const payload = buildClassificationPayload(result);
        expect(payload.url).toBe('https://example.com/page');
        expect(payload.title).toBe('Example Page');
        expect(payload.h1).toBe('Example H1');
        expect(payload.metaDescription).toBe('Short meta.');
        expect((payload.bodyExcerpt as string).length).toBe(2000);
    });

    it('handles missing seo and bodyTextExcerpt', () => {
        const result: ScanResult = {
            id: 's2',
            url: 'https://example.com',
            timestamp: '',
            standard: 'WCAG2AA',
            device: 'desktop',
            runners: [],
            issues: [],
            passes: [],
            stats: { errors: 0, warnings: 0, notices: 0 },
            durationMs: 0,
            score: 80,
            screenshot: '',
            performance: { ttfb: 0, fcp: 0, domLoad: 0, windowLoad: 0, lcp: 0 },
            eco: { co2: 0, grade: 'A', pageWeight: 0 },
        } as ScanResult;
        const payload = buildClassificationPayload(result);
        expect(payload.url).toBe('https://example.com');
        expect(payload.title).toBeUndefined();
        expect(payload.bodyExcerpt).toBeUndefined();
    });
});
