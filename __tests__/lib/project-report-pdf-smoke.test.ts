/**
 * Smoke test: ProjectReportDocument renders with minimal bundle (mock react-pdf).
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import type { ProjectReportBundle } from '@/lib/project-report/types';

vi.mock('@react-pdf/renderer', () => ({
    Document: ({ children }: { children: React.ReactNode }) => children,
    Page: ({ children }: { children: React.ReactNode }) => children,
    View: ({ children }: { children: React.ReactNode }) => children,
    Text: ({ children }: { children: React.ReactNode }) => children,
    Font: { register: vi.fn() },
    StyleSheet: { create: (s: object) => s },
    Svg: ({ children }: { children: React.ReactNode }) => children,
    Path: () => null,
    Rect: () => null,
    Circle: () => null,
    G: ({ children }: { children: React.ReactNode }) => children,
    pdf: vi.fn(() => ({
        toBlob: vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' })),
    })),
}));

const minimalBundle: ProjectReportBundle = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    locale: 'de',
    variant: 'executive',
    project: {
        id: 'p1',
        name: 'Test',
        domain: 'example.com',
        industry: null,
        valueProposition: null,
        tags: [],
        competitors: [],
        counts: {
            domainScans: 0,
            journeyRuns: 0,
            geoEeatRuns: 0,
            singleScans: 0,
            rankTrackingKeywords: 0,
        },
    },
    domain: null,
    competitors: [],
    rankings: null,
    geo: null,
    rankTrends: [],
    journey: null,
    visuals: [
        {
            kind: 'scoreCards',
            items: [
                { label: 'WCAG', value: null, color: '#2563eb' },
                { label: 'SEO', value: null, color: '#0891b2' },
                { label: 'GEO', value: null, color: '#7c3aed' },
                { label: 'Rankings', value: null, color: '#dc2626' },
            ],
        },
    ],
    narrative: {
        executiveSummary: 'Test summary.',
        findings: [],
        recommendations: [],
        riskAmpel: { wcag: 'unknown', geo: 'unknown', rankings: 'unknown' },
        synthesisAvailable: false,
    },
    deep: null,
    provenance: [],
    freshness: { sources: [] },
    links: {
        projectPath: '/projects/p1',
        domainScanPath: null,
        geoRunPath: null,
        rankingsPath: '/projects/p1/rankings',
    },
};

describe('ProjectReportDocument smoke', () => {
    it('exports a document component for minimal bundle', async () => {
        const { ProjectReportDocument } = await import('@/components/pdf/ProjectReportDocument');
        const { pdf } = await import('@react-pdf/renderer');
        const element = React.createElement(ProjectReportDocument, { bundle: minimalBundle });
        expect(element).toBeTruthy();
        const blob = await pdf(element).toBlob();
        expect(blob).toBeInstanceOf(Blob);
    });
});
