import { describe, it, expect } from 'vitest';
import { detectYmyl } from './ymyl-heuristic';

describe('detectYmyl', () => {
    it('detects YMYL from URL path', () => {
        const r = detectYmyl('https://example.com/finanz/beratung', '', '', '');
        expect(r.isYmyl).toBe(true);
        expect(r.confidence).toBe('high');
    });

    it('detects YMYL from keywords', () => {
        const r = detectYmyl('https://example.com/page', 'Insurance Guide', 'we offer insurance and credit solutions for your retirement', '');
        expect(r.isYmyl).toBe(true);
        expect(r.signals.length).toBeGreaterThan(0);
    });

    it('returns non-YMYL for generic content', () => {
        const r = detectYmyl('https://example.com/blog/post', 'How to cook pasta', 'recipe for spaghetti carbonara with olive oil', '');
        expect(r.isYmyl).toBe(false);
    });
});
