import { normalizePageTopicTagKey } from '@/lib/domain-aggregation';
import type { AggregatedPageClassificationTheme } from '@/lib/types';

/** Max themes in the bubble chart (readability). */
export const PAGE_TOPICS_CHART_MAX_THEMES = 40;

/**
 * Fill for bubble chart and tier-spectrum segments (T1 = Rand … T5 = Kernthema / Akzent).
 * `accentCss` should be `THEME_ACCENT_CSS` from the app theme helper.
 */
export function pageTopicTierColorCss(tier: 1 | 2 | 3 | 4 | 5, accentCss: string): string {
    switch (tier) {
        case 1:
            return 'var(--color-border-subtle, #e8ecf0)';
        case 2:
            return 'var(--color-secondary-dx-grey-light-tint, #d1d5db)';
        case 3:
            return 'var(--color-text-muted-on-light, #9ca3af)';
        case 4:
            return '#4ade80';
        case 5:
            return accentCss;
    }
}

/** Points for scatter / bubble matrix. */
export type PageTopicsBubblePoint = {
    tag: string;
    themeTagKey: string;
    avgTier: number;
    maxTier: 1 | 2 | 3 | 4 | 5;
    pageCount: number;
    /** Bubble area driver (raw score). */
    zSize: number;
};

export function buildPageTopicsBubblePoints(
    themes: AggregatedPageClassificationTheme[],
    options?: { maxThemes?: number }
): PageTopicsBubblePoint[] {
    const cap = options?.maxThemes ?? PAGE_TOPICS_CHART_MAX_THEMES;
    const sorted = [...themes].sort((a, b) => b.score - a.score).slice(0, cap);
    return sorted.map((th) => ({
        tag: th.tag,
        themeTagKey: th.themeTagKey ?? normalizePageTopicTagKey(th.tag),
        avgTier: Math.min(5, Math.max(1, th.avgTier)),
        maxTier: th.maxTier,
        pageCount: th.pageCount,
        zSize: Math.max(th.score, 0.25),
    }));
}

/** Stroke / legend color for compare-matrix series (distinct from tier fill colors). */
export const PAGE_TOPICS_COMPARE_SERIES_STROKE: readonly string[] = [
    '#1d4ed8',
    '#b91c1c',
    '#a16207',
    '#7e22ce',
    '#0e7490',
    '#c2410c',
    '#3f6212',
    '#be185d',
] as const;

export function pageTopicsCompareSeriesStrokeColor(seriesIndex: number): string {
    return PAGE_TOPICS_COMPARE_SERIES_STROKE[seriesIndex % PAGE_TOPICS_COMPARE_SERIES_STROKE.length]!;
}

/** Max bubbles in project compare matrix (own + competitors merged). */
export const PAGE_TOPICS_COMPARE_MAX_TOTAL = 72;

/** Per-source cap before global merge (keeps chart readable). */
export const PAGE_TOPICS_COMPARE_PER_SOURCE = 22;

/** Bubble point with source (own vs competitor) for combined project view. */
export type PageTopicsBubblePointCompare = PageTopicsBubblePoint & {
    seriesKey: string;
    seriesLabel: string;
    seriesIndex: number;
    /** Normalized theme key shared across sources (for matching + connectors). */
    baseTagKey: string;
};

export function buildCombinedCompareBubblePoints(
    sources: ReadonlyArray<{ key: string; label: string; themes: AggregatedPageClassificationTheme[] }>,
    options?: { perSourceMax?: number; maxTotal?: number }
): PageTopicsBubblePointCompare[] {
    const perSourceMax = options?.perSourceMax ?? PAGE_TOPICS_COMPARE_PER_SOURCE;
    const maxTotal = options?.maxTotal ?? PAGE_TOPICS_COMPARE_MAX_TOTAL;
    const flat: PageTopicsBubblePointCompare[] = [];
    sources.forEach((src, seriesIndex) => {
        if (!src.themes?.length) return;
        const pts = buildPageTopicsBubblePoints(src.themes, { maxThemes: perSourceMax });
        for (const p of pts) {
            const baseTagKey = p.themeTagKey;
            flat.push({
                ...p,
                seriesKey: src.key,
                seriesLabel: src.label,
                seriesIndex,
                baseTagKey,
                themeTagKey: `${src.key}::${baseTagKey}`,
            });
        }
    });
    flat.sort((a, b) => b.zSize - a.zSize);
    return flat.slice(0, maxTotal);
}

/** Normalized segments for a single-row “tier spectrum” (share of avg tags per tier). */
export type TierStripSegment = { tier: 1 | 2 | 3 | 4 | 5; ratio: number };

export function buildAvgTierTagStrip(avgs: {
    tier1: number;
    tier2: number;
    tier3: number;
    tier4: number;
    tier5: number;
}): TierStripSegment[] {
    const raw = [avgs.tier1, avgs.tier2, avgs.tier3, avgs.tier4, avgs.tier5] as const;
    const sum = raw.reduce((a, b) => a + b, 0);
    if (sum <= 0) {
        return ([1, 2, 3, 4, 5] as const).map((tier) => ({ tier, ratio: 0.2 }));
    }
    return ([1, 2, 3, 4, 5] as const).map((tier, i) => ({
        tier,
        ratio: raw[i] / sum,
    }));
}
