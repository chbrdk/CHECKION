import type { AggregatedPageClassificationTheme } from '@/lib/types';

/** Max tiles so the treemap stays readable on domain overviews. */
export const PAGE_TOPICS_TREEMAP_MAX_THEMES = 40;

/**
 * Fill for treemap tiles and tier-spectrum segments (T1 = Rand … T5 = Kernthema / Akzent).
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

export type PageTopicsTreemapLeaf = {
    /** Short label inside tiles (may be truncated). */
    name: string;
    /** Full theme text for tooltips. */
    fullName: string;
    /** Area weight (squarified treemap); derived from classification score. */
    value: number;
    maxTier: 1 | 2 | 3 | 4 | 5;
    pageCount: number;
};

/**
 * Build flat treemap leaves (Recharts `Treemap` expects `data` = array of children).
 * Sorted by score descending; long labels truncated for layout.
 */
export function buildPageTopicsTreemapLeaves(themes: AggregatedPageClassificationTheme[]): PageTopicsTreemapLeaf[] {
    const sorted = [...themes].sort((a, b) => b.score - a.score).slice(0, PAGE_TOPICS_TREEMAP_MAX_THEMES);
    return sorted.map((th) => ({
        fullName: th.tag,
        name: th.tag.length > 48 ? `${th.tag.slice(0, 45)}…` : th.tag,
        value: Math.max(Math.sqrt(th.score), 0.25),
        maxTier: th.maxTier,
        pageCount: th.pageCount,
    }));
}

/** Points for scatter / bubble matrix (same cap as treemap for parity). */
export type PageTopicsBubblePoint = {
    tag: string;
    avgTier: number;
    maxTier: 1 | 2 | 3 | 4 | 5;
    pageCount: number;
    /** Bubble area driver (raw score). */
    zSize: number;
};

export function buildPageTopicsBubblePoints(themes: AggregatedPageClassificationTheme[]): PageTopicsBubblePoint[] {
    const sorted = [...themes].sort((a, b) => b.score - a.score).slice(0, PAGE_TOPICS_TREEMAP_MAX_THEMES);
    return sorted.map((th) => ({
        tag: th.tag,
        avgTier: Math.min(5, Math.max(1, th.avgTier)),
        maxTier: th.maxTier,
        pageCount: th.pageCount,
        zSize: Math.max(th.score, 0.25),
    }));
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
