import { describe, expect, it } from 'vitest';
import { formatUrlForList } from '@/lib/format-url-display';

describe('formatUrlForList', () => {
    it('returns host + path without protocol', () => {
        expect(formatUrlForList('https://www.example.com/foo?q=1')).toBe('example.com/foo?q=1');
    });

    it('truncates long URLs', () => {
        const long =
            'https://example.com/' + 'a'.repeat(80);
        const out = formatUrlForList(long, 40);
        expect(out.length).toBeLessThanOrEqual(40);
        expect(out.endsWith('…')).toBe(true);
    });

    it('handles non-URL strings', () => {
        expect(formatUrlForList('not a url', 20)).toBe('not a url');
    });
});
