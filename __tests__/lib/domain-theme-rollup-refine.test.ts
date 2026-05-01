import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
    applyKeptThemeTagKeysToTopThemes,
    refineAggregatedPageClassificationWithLlm,
} from '@/lib/llm/domain-theme-rollup-refine';
import type { AggregatedPageClassification } from '@/lib/types';

vi.mock('@/lib/llm/config', () => ({
    getAnthropicKey: vi.fn(),
    PAGE_TOPIC_ROLLUP_REFINE_CLAUDE_MODEL: 'claude-haiku-test',
    PAGE_TOPIC_ROLLUP_REFINE_MAX_TOKENS: 1024,
}));

vi.mock('@/lib/usage-report', () => ({
    reportUsage: vi.fn(),
}));

import { getAnthropicKey } from '@/lib/llm/config';

describe('applyKeptThemeTagKeysToTopThemes', () => {
    it('reorders and filters by keys; skips unknown keys', () => {
        const themes = [
            { tag: 'Alpha', themeTagKey: 'alpha', score: 10, pageCount: 2, maxTier: 5 as const, avgTier: 4 },
            { tag: 'Beta', themeTagKey: 'beta', score: 8, pageCount: 1, maxTier: 4 as const, avgTier: 3 },
            { tag: 'Gamma', themeTagKey: 'gamma', score: 6, pageCount: 3, maxTier: 3 as const, avgTier: 3 },
        ];
        const out = applyKeptThemeTagKeysToTopThemes(themes, ['gamma', 'missing', 'alpha']);
        expect(out.map((t) => t.themeTagKey)).toEqual(['gamma', 'alpha']);
    });

    it('uses normalized tag when themeTagKey absent', () => {
        const themes = [
            { tag: 'Hello World', score: 1, pageCount: 1, maxTier: 2 as const, avgTier: 2 },
        ];
        const out = applyKeptThemeTagKeysToTopThemes(themes, ['hello world']);
        expect(out).toHaveLength(1);
        expect(out[0]?.tag).toBe('Hello World');
    });
});

describe('refineAggregatedPageClassificationWithLlm', () => {
    beforeEach(() => {
        vi.mocked(getAnthropicKey).mockReset();
        process.env.CHECKION_DISABLE_PAGE_TOPIC_ROLLUP_REFINE = '';
    });

    it('returns input unchanged when Anthropic key missing', async () => {
        vi.mocked(getAnthropicKey).mockReturnValue(null);
        const pc: AggregatedPageClassification = {
            coverage: { totalPages: 1, pagesWithClassification: 1 },
            topThemes: [
                {
                    tag: 'X',
                    themeTagKey: 'x',
                    score: 9,
                    pageCount: 1,
                    maxTier: 5,
                    avgTier: 5,
                },
            ],
            tierDistribution: {
                avgTagsPerPageByTier: { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 },
                pagesWithAtLeastOneTier5: 1,
                pagesDominatedByLowTiers: 0,
            },
            pageSamples: [],
        };
        const out = await refineAggregatedPageClassificationWithLlm(pc, {
            domainOrigin: 'https://example.com',
            userId: 'u1',
            domainScanId: 'scan1',
        });
        expect(out).toBe(pc);
        expect(out.themeRollup).toBeUndefined();
    });

    it('returns input unchanged when disabled via env', async () => {
        vi.mocked(getAnthropicKey).mockReturnValue('sk-test');
        process.env.CHECKION_DISABLE_PAGE_TOPIC_ROLLUP_REFINE = '1';
        const pc: AggregatedPageClassification = {
            coverage: { totalPages: 1, pagesWithClassification: 1 },
            topThemes: [{ tag: 'X', themeTagKey: 'x', score: 9, pageCount: 1, maxTier: 5, avgTier: 5 }],
            tierDistribution: {
                avgTagsPerPageByTier: { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 },
                pagesWithAtLeastOneTier5: 1,
                pagesDominatedByLowTiers: 0,
            },
            pageSamples: [],
        };
        const out = await refineAggregatedPageClassificationWithLlm(pc, {
            domainOrigin: 'https://example.com',
            userId: 'u1',
            domainScanId: 'scan1',
        });
        expect(out.themeRollup).toBeUndefined();
    });
});
