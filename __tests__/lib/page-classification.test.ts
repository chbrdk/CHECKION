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
    it('parses valid JSON with tags, tier, shortSummary', () => {
        const raw = JSON.stringify({
            tags: ['Pumpen', 'Technische Daten'],
            tier: 5,
            shortSummary: 'Produktseite zu Pumpen mit technischen Daten.',
        });
        const result = parseClassificationResponse(raw);
        expect(result.tags).toEqual(['Pumpen', 'Technische Daten']);
        expect(result.tier).toBe(5);
        expect(result.shortSummary).toBe('Produktseite zu Pumpen mit technischen Daten.');
    });

    it('parses valid JSON without shortSummary', () => {
        const raw = JSON.stringify({ tags: ['Kontakt'], tier: 4 });
        const result = parseClassificationResponse(raw);
        expect(result.tags).toEqual(['Kontakt']);
        expect(result.tier).toBe(4);
        expect(result.shortSummary).toBeUndefined();
    });

    it('returns fallback (tier 3, empty tags) for empty content', () => {
        const result = parseClassificationResponse('');
        expect(result.tags).toEqual([]);
        expect(result.tier).toBe(3);
    });

    it('returns fallback for invalid JSON', () => {
        const result = parseClassificationResponse('not json at all');
        expect(result.tags).toEqual([]);
        expect(result.tier).toBe(3);
    });

    it('returns fallback for invalid tier (schema fails, full fallback)', () => {
        const raw = JSON.stringify({ tags: ['A'], tier: 99 });
        const result = parseClassificationResponse(raw);
        expect(result.tier).toBe(3);
        expect(result.tags).toEqual([]);
    });

    it('limits tags to 8 when more provided', () => {
        const raw = JSON.stringify({
            tags: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
            tier: 2,
        });
        const result = parseClassificationResponse(raw);
        expect(result.tags.length).toBe(8);
        expect(result.tags).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
        expect(result.tier).toBe(2);
    });
});

describe('extractJsonFromResponse', () => {
    it('extracts JSON from markdown code block', () => {
        const content = '```json\n{"tags":["X"],"tier":1}\n```';
        const out = extractJsonFromResponse(content);
        expect(out).toBe('{"tags":["X"],"tier":1}');
    });

    it('returns trimmed content when no code block', () => {
        const content = '  {"tags":["Y"],"tier":2}  ';
        const out = extractJsonFromResponse(content);
        expect(out).toBe('{"tags":["Y"],"tier":2}');
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
