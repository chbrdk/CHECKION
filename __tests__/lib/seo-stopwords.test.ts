import { describe, it, expect } from 'vitest';
import { isSeoStopword, SEO_STOPWORDS } from '@/lib/seo-stopwords';

describe('isSeoStopword', () => {
    it('filters common DE/EN stopwords from merged lists', () => {
        expect(isSeoStopword('der')).toBe(true);
        expect(isSeoStopword('und')).toBe(true);
        expect(isSeoStopword('the')).toBe(true);
        expect(isSeoStopword('because')).toBe(true);
        expect(isSeoStopword('weil')).toBe(true);
    });

    it('rejects short tokens and pure numbers', () => {
        expect(isSeoStopword('ab')).toBe(true);
        expect(isSeoStopword('42')).toBe(true);
        expect(isSeoStopword('2024')).toBe(true);
    });

    it('allows content-like tokens', () => {
        expect(isSeoStopword('photovoltaik')).toBe(false);
        expect(isSeoStopword('marketing')).toBe(false);
    });

    it('merged set is non-trivial (EN+DE+extras)', () => {
        expect(SEO_STOPWORDS.size).toBeGreaterThan(500);
    });
});
