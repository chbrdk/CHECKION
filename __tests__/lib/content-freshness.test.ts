import { describe, it, expect } from 'vitest';
import { computeContentFreshness } from '@/lib/content-freshness';

describe('computeContentFreshness', () => {
    it('returns unknown when no signals', () => {
        const r = computeContentFreshness({
            scanTimestampIso: '2025-06-01T12:00:00.000Z',
        });
        expect(r.confidence).toBe('unknown');
        expect(r.bestAsOfIso).toBeNull();
        expect(r.ageDays).toBeNull();
        expect(r.signals).toHaveLength(0);
    });

    it('prefers HTTP Last-Modified when it is the latest instant', () => {
        const r = computeContentFreshness({
            documentCacheHints: { lastModified: 'Sun, 01 Jun 2025 10:00:00 GMT' },
            scanTimestampIso: '2025-06-15T12:00:00.000Z',
        });
        expect(r.bestAsOfSource).toBe('http_last_modified');
        expect(r.confidence).toBe('high');
        expect(r.ageDays).toBeGreaterThanOrEqual(13);
    });

    it('uses JSON-LD modified with high confidence', () => {
        const r = computeContentFreshness({
            structured: {
                jsonLdDateModified: '2025-05-20T08:00:00.000Z',
            },
            scanTimestampIso: '2025-06-01T12:00:00.000Z',
        });
        expect(r.bestAsOfSource).toBe('jsonld_date_modified');
        expect(r.confidence).toBe('high');
        expect(r.ageDays).toBeGreaterThanOrEqual(12);
        expect(r.ageDays).toBeLessThan(13);
    });

    it('downgrades confidence when sources spread widely', () => {
        const r = computeContentFreshness({
            documentCacheHints: { lastModified: 'Sun, 01 Jan 2023 10:00:00 GMT' },
            structured: {
                ogArticleModifiedTime: '2025-05-01T12:00:00.000Z',
            },
            scanTimestampIso: '2025-06-01T12:00:00.000Z',
        });
        expect(r.notes).toContain('source_spread');
        expect(r.confidence).toBe('low');
        expect(r.bestAsOfSource).toBe('og_article_modified_time');
    });

    it('adds html_long_cache note without changing best source', () => {
        const r = computeContentFreshness({
            structured: {
                jsonLdDatePublished: '2025-01-01T00:00:00.000Z',
            },
            mainDocumentCache: { htmlLongCache: true },
            scanTimestampIso: '2025-06-01T12:00:00.000Z',
        });
        expect(r.notes).toContain('html_long_cache');
        expect(r.bestAsOfSource).toBe('jsonld_date_published');
        expect(r.confidence).toBe('low');
    });
});
