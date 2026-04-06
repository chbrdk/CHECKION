import { describe, it, expect } from 'vitest';
import {
    PAGE_TOPICS_CHART_MAX_THEMES,
    buildPageTopicsBubblePoints,
    buildAvgTierTagStrip,
    pageTopicTierColorCss,
} from '@/lib/page-topics-viz';
import type { AggregatedPageClassificationTheme } from '@/lib/types';

const theme = (over: Partial<AggregatedPageClassificationTheme> = {}): AggregatedPageClassificationTheme => ({
    tag: 'Alpha',
    score: 10,
    pageCount: 2,
    maxTier: 3,
    avgTier: 2.5,
    ...over,
});

describe('page-topics-viz', () => {
    it('buildPageTopicsBubblePoints sorts by score and caps count', () => {
        const themes: AggregatedPageClassificationTheme[] = [
            theme({ tag: 'low', score: 1, pageCount: 1, maxTier: 1 }),
            theme({ tag: 'high', score: 100, pageCount: 5, maxTier: 5 }),
            theme({ tag: 'mid', score: 50, pageCount: 3, maxTier: 4 }),
        ];
        const pts = buildPageTopicsBubblePoints(themes);
        expect(pts[0]?.tag).toBe('high');
        expect(pts[1]?.tag).toBe('mid');
        expect(pts[2]?.tag).toBe('low');
        expect(pts.every((p) => p.zSize > 0)).toBe(true);
    });

    it('respects PAGE_TOPICS_CHART_MAX_THEMES', () => {
        const many = Array.from({ length: PAGE_TOPICS_CHART_MAX_THEMES + 12 }, (_, i) =>
            theme({ tag: `t${i}`, score: i + 1, pageCount: 1, maxTier: 2 }),
        );
        expect(buildPageTopicsBubblePoints(many)).toHaveLength(PAGE_TOPICS_CHART_MAX_THEMES);
    });

    it('buildAvgTierTagStrip normalizes ratios to ~1', () => {
        const strip = buildAvgTierTagStrip({ tier1: 2, tier2: 2, tier3: 2, tier4: 2, tier5: 2 });
        const sum = strip.reduce((a, s) => a + s.ratio, 0);
        expect(sum).toBeCloseTo(1, 5);
        expect(strip).toHaveLength(5);
    });

    it('buildAvgTierTagStrip handles all zeros', () => {
        const strip = buildAvgTierTagStrip({ tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 });
        expect(strip.every((s) => s.ratio === 0.2)).toBe(true);
    });

    it('pageTopicTierColorCss returns strings for each tier', () => {
        const accent = 'var(--color-theme-accent)';
        for (const tier of [1, 2, 3, 4, 5] as const) {
            expect(pageTopicTierColorCss(tier, accent).length).toBeGreaterThan(2);
        }
        expect(pageTopicTierColorCss(5, accent)).toBe(accent);
    });

    it('buildPageTopicsBubblePoints aligns with cap and preserves score order', () => {
        const many = Array.from({ length: PAGE_TOPICS_CHART_MAX_THEMES + 5 }, (_, i) =>
            theme({ tag: `t${i}`, score: i + 1, pageCount: i % 3, maxTier: 2, avgTier: 2 }),
        );
        const pts = buildPageTopicsBubblePoints(many);
        expect(pts).toHaveLength(PAGE_TOPICS_CHART_MAX_THEMES);
        expect(pts[0]?.zSize).toBeGreaterThan(pts[pts.length - 1]!.zSize);
    });
});
