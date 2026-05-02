import { describe, it, expect } from 'vitest';
import { aggregateGenerative } from '@/lib/domain-aggregation';
import type { ScanResult } from '@/lib/types';

function minimalScan(overrides: Partial<ScanResult>): ScanResult {
    return {
        id: '1',
        url: 'https://example.com/p',
        timestamp: new Date().toISOString(),
        standard: 'WCAG2AA',
        device: 'desktop',
        runners: [],
        issues: [],
        passes: [],
        stats: { critical: 0, serious: 0, moderate: 0, minor: 0 },
        durationMs: 1,
        score: 90,
        screenshot: '',
        performance: { ttfb: 0, fcp: 0, domLoad: 0, windowLoad: 0, lcp: 0 },
        eco: { co2: 0, grade: 'A', pageWeight: 0 },
        ...overrides,
    } as ScanResult;
}

describe('aggregateGenerative', () => {
    it('averages discoverability and repurposing when dimensions are present', () => {
        const a = minimalScan({
            url: 'https://a.com',
            generative: {
                score: 70,
                dimensions: { discoverability: 80, repurposing: 60 },
                technical: {
                    hasLlmsTxt: true,
                    hasRobotsAllowingAI: true,
                    schemaCoverage: ['Article'],
                    recommendedSchemaTypesFound: ['Article'],
                    missingRecommendedSchemaTypes: [],
                },
                content: { faqCount: 1, tableCount: 1, listDensity: 0.1, citationDensity: 2 },
                expertise: { hasAuthorBio: true, hasExpertCitations: false },
                repurposingSignals: {
                    hasFaqPageSchema: true,
                    hasHowToSchema: false,
                    hasBreadcrumbList: true,
                },
            },
        });
        const b = minimalScan({
            url: 'https://b.com',
            generative: {
                score: 50,
                dimensions: { discoverability: 40, repurposing: 40 },
                technical: {
                    hasLlmsTxt: false,
                    hasRobotsAllowingAI: true,
                    schemaCoverage: [],
                    recommendedSchemaTypesFound: [],
                    missingRecommendedSchemaTypes: ['FAQPage'],
                },
                content: { faqCount: 0, tableCount: 0, listDensity: 0, citationDensity: 0 },
                expertise: { hasAuthorBio: false, hasExpertCitations: false },
                repurposingSignals: {
                    hasFaqPageSchema: false,
                    hasHowToSchema: false,
                    hasBreadcrumbList: false,
                },
            },
        });
        const agg = aggregateGenerative([a, b]);
        expect(agg).not.toBeNull();
        expect(agg!.avgDiscoverability).toBe(60);
        expect(agg!.avgRepurposing).toBe(50);
        expect(agg!.weakestRepurposingPages?.[0].url).toBe('https://b.com');
        expect(agg!.issuePatterns?.pagesWithoutFaqSchema).toBe(1);
    });
});
