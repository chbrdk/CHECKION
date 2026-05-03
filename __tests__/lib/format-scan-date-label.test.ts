import { describe, expect, it } from 'vitest';
import { formatScanDateLabelUtc } from '@/lib/format-scan-date-label';

describe('formatScanDateLabelUtc', () => {
    it('matches fixed output for a UTC instant (SSR / client stable)', () => {
        expect(formatScanDateLabelUtc('2026-05-15T12:00:00.000Z', 'en')).toBe('May 15, 2026');
        expect(formatScanDateLabelUtc('2026-05-15T12:00:00.000Z', 'de')).toBe('15. Mai 2026');
    });

    it('returns a non-empty string for date-only ISO day strings', () => {
        const en = formatScanDateLabelUtc('2026-01-31', 'en');
        expect(en.length).toBeGreaterThan(0);
        expect(en).toMatch(/2026/);
    });
});
