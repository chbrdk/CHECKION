import { describe, it, expect } from 'vitest';
import { pdfChartFullLabel, pdfChartLegendEntries } from '@/lib/paths/pdf-chart-labels';

describe('pdf-chart-labels', () => {
    it('keeps full labels without ellipsis', () => {
        const long = 'very-long-competitor-domain.example.co.uk';
        expect(pdfChartFullLabel(long)).toBe(long);
        expect(pdfChartFullLabel(`  ${long}  `)).toBe(long);
    });

    it('builds legend entries with full labels and values', () => {
        const entries = pdfChartLegendEntries([
            { label: 'example.com', color: '#000', value: 80 },
            { label: 'another.example.com', color: '#111', value: 72.5 },
        ]);
        expect(entries[0]?.label).toBe('example.com');
        expect(entries[1]?.label).toBe('another.example.com');
    });
});
