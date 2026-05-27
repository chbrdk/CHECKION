import { describe, it, expect } from 'vitest';
import { groupKeywordsByIntent, resolveIntentFields, slugifyIntentKey } from '@/lib/serp-intent';

describe('serp-intent', () => {
    it('slugifyIntentKey normalizes labels', () => {
        expect(slugifyIntentKey('Industriepumpen!')).toBe('industriepumpen');
    });

    it('resolveIntentFields uses label when key omitted', () => {
        expect(resolveIntentFields('industrial pump', undefined, 'Industrial pumps')).toEqual({
            intentKey: 'industrial-pumps',
            intentLabel: 'Industrial pumps',
        });
    });

    it('groupKeywordsByIntent groups by intentKey', () => {
        const groups = groupKeywordsByIntent([
            {
                id: '1',
                keyword: 'industriepumpe',
                country: 'de',
                language: 'de',
                intentKey: 'industrial-pumps',
                intentLabel: 'Industrial pumps',
            },
            {
                id: '2',
                keyword: 'industrial pump',
                country: 'us',
                language: 'en',
                intentKey: 'industrial-pumps',
                intentLabel: 'Industrial pumps',
            },
        ]);
        expect(groups).toHaveLength(1);
        expect(groups[0]?.variants).toHaveLength(2);
    });

    it('groupKeywordsByIntent accepts keywords without country/language', () => {
        const groups = groupKeywordsByIntent([
            { id: '1', keyword: 'test', intentKey: 'test', intentLabel: 'Test' },
            { id: '2', keyword: 'test en', intentKey: 'test', intentLabel: 'Test' },
        ]);
        expect(groups).toHaveLength(1);
        expect(groups[0]?.variants).toHaveLength(2);
    });
});
