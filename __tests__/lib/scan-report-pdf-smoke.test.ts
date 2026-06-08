/**
 * Smoke test: ScanReportDocument renders with minimal scan (mock react-pdf).
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import type { ScanResult } from '@/lib/types';
import { PDF_FONT_FAMILIES } from '@/lib/paths/pdf-fonts';

vi.mock('@react-pdf/renderer', () => ({
    Document: ({ children }: { children: React.ReactNode }) => children,
    Page: ({ children }: { children: React.ReactNode }) => children,
    View: ({ children }: { children: React.ReactNode }) => children,
    Text: ({ children }: { children: React.ReactNode }) => children,
    Font: { register: vi.fn() },
    StyleSheet: { create: (s: object) => s },
    Svg: ({ children }: { children: React.ReactNode }) => children,
    Path: () => null,
    pdf: vi.fn(() => ({
        toBlob: vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' })),
    })),
}));

const minimalScan: ScanResult = {
    id: 'scan-1',
    url: 'https://example.com',
    timestamp: new Date().toISOString(),
    standard: 'WCAG2AA',
    device: 'Desktop',
    score: 72,
    stats: { errors: 1, warnings: 2, notices: 3 },
    issues: [],
};

describe('ScanReportDocument smoke', () => {
    it('exports a document component using MSQDX PDF fonts', async () => {
        const { ScanReportDocument } = await import('@/components/pdf/ScanReportDocument');
        const { pdf } = await import('@react-pdf/renderer');
        const element = React.createElement(ScanReportDocument, { scan: minimalScan });
        expect(element).toBeTruthy();
        const blob = await pdf(element).toBlob();
        expect(blob).toBeInstanceOf(Blob);
        expect(PDF_FONT_FAMILIES.body).toBe('Noto Sans');
        expect(PDF_FONT_FAMILIES.headline).toBe('IBM Plex Mono');
    });
});
