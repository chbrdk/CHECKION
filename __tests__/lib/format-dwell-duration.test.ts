import { describe, expect, it } from 'vitest';
import { formatDwellRange, formatDwellSeconds } from '@/lib/format-dwell-duration';

describe('formatDwellSeconds', () => {
    it('formats German', () => {
        expect(formatDwellSeconds(45, 'de')).toBe('45 Sek.');
        expect(formatDwellSeconds(120, 'de')).toBe('2 Min.');
        expect(formatDwellSeconds(135, 'de')).toBe('2 Min. 15 Sek.');
    });
    it('formats English', () => {
        expect(formatDwellSeconds(90, 'en')).toBe('1 min 30s');
    });
});

describe('formatDwellRange', () => {
    it('joins min–max', () => {
        expect(formatDwellRange(40, 90, 'de')).toBe('40 Sek. – 1 Min. 30 Sek.');
    });
});
