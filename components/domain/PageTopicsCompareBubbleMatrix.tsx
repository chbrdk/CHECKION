'use client';

import { useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import {
    Tooltip,
    ResponsiveContainer,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    CartesianGrid,
} from 'recharts';
import { MsqdxTypography, MsqdxButton } from '@msqdx/react';
import {
    buildCombinedCompareBubblePoints,
    pageTopicTierColorCss,
    pageTopicsCompareSeriesStrokeColor,
    type PageTopicsBubblePointCompare,
} from '@/lib/page-topics-viz';
import type { AggregatedPageClassificationTheme } from '@/lib/types';
import { THEME_ACCENT_CSS } from '@/lib/theme-accent';

type Translate = (key: string, values?: Record<string, string | number>) => string;

export type PageTopicsCompareBubbleMatrixProps = {
    t: Translate;
    sources: ReadonlyArray<{ key: string; label: string; themes: AggregatedPageClassificationTheme[] }>;
};

function CompareBubbleTooltip({
    active,
    payload,
    t,
}: {
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: PageTopicsBubblePointCompare }>;
    t: Translate;
}) {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    if (!p?.tag) return null;
    return (
        <Box
            sx={{
                px: 1.25,
                py: 1,
                maxWidth: 340,
                bgcolor: 'var(--color-card-bg, #fff)',
                border: '1px solid var(--color-border-subtle, #e5e7eb)',
                borderRadius: 'var(--msqdx-radius-sm, 6px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
        >
            <MsqdxTypography variant="caption" sx={{ fontWeight: 600, display: 'block', color: 'var(--color-text-muted-on-light)' }}>
                {p.seriesLabel}
            </MsqdxTypography>
            <MsqdxTypography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.35, mt: 0.25 }}>
                {p.tag}
            </MsqdxTypography>
            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mt: 0.5 }}>
                {t('projects.pageTopicsCompareBubbleTooltip', {
                    pages: p.pageCount,
                    maxTier: p.maxTier,
                    avgTier: p.avgTier,
                    score: Math.round(p.zSize * 100) / 100,
                })}
            </MsqdxTypography>
            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mt: 0.75, fontStyle: 'italic' }}>
                {t('projects.pageTopicsCompareTooltipHint')}
            </MsqdxTypography>
        </Box>
    );
}

/** Renders after Scatter; uses pixel coords collected during the same render pass. */
function TagConnectorOverlay({
    focusTagKey,
    dotPositionsRef,
}: {
    focusTagKey: string | null;
    dotPositionsRef: React.MutableRefObject<Map<string, { cx: number; cy: number }[]>>;
}) {
    if (!focusTagKey) return null;
    const pts = dotPositionsRef.current.get(focusTagKey);
    if (!pts || pts.length < 2) return null;
    const sorted = [...pts].sort((a, b) => a.cx - b.cx);
    const d = sorted.map((p) => `${p.cx},${p.cy}`).join(' ');
    return (
        <polyline
            points={d}
            fill="none"
            stroke="var(--color-text-muted-on-light, #64748b)"
            strokeWidth={1.75}
            strokeDasharray="6 4"
            opacity={0.92}
            pointerEvents="none"
        />
    );
}

export function PageTopicsCompareBubbleMatrix({ t, sources }: PageTopicsCompareBubbleMatrixProps) {
    const points = useMemo(() => buildCombinedCompareBubblePoints(sources), [sources]);
    const [focusSeriesKey, setFocusSeriesKey] = useState<string | null>(null);
    const [focusTagKey, setFocusTagKey] = useState<string | null>(null);
    const dotPositionsRef = useRef<Map<string, { cx: number; cy: number }[]>>(new Map());

    const seriesLegend = useMemo(() => {
        const byKey = new Map<string, { label: string; index: number }>();
        for (const p of points) {
            if (!byKey.has(p.seriesKey)) {
                byKey.set(p.seriesKey, { label: p.seriesLabel, index: p.seriesIndex });
            }
        }
        return Array.from(byKey.entries()).map(([key, v]) => ({ key, ...v }));
    }, [points]);

    const tagSourceCount = useMemo(() => {
        if (!focusTagKey) return 0;
        const keys = new Set(points.filter((p) => p.baseTagKey === focusTagKey).map((p) => p.seriesKey));
        return keys.size;
    }, [focusTagKey, points]);

    const anyFocus = focusSeriesKey != null || focusTagKey != null;

    const gridStroke = 'var(--color-border-subtle, #e5e7eb)';
    const axisTick = { fill: 'var(--color-text-muted-on-light)', fontSize: 11 };

    dotPositionsRef.current = new Map();

    if (points.length === 0) {
        return null;
    }

    const clearFocus = () => {
        setFocusSeriesKey(null);
        setFocusTagKey(null);
    };

    const pointFullOpacity = (p: PageTopicsBubblePointCompare) => {
        if (!anyFocus) return true;
        if (focusSeriesKey != null && p.seriesKey !== focusSeriesKey) return false;
        if (focusTagKey != null && p.baseTagKey !== focusTagKey) return false;
        return true;
    };

    return (
        <Box sx={{ mb: 1 }}>
            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 0.5 }}>
                {t('projects.pageTopicsCombinedDiagramCaption')}
            </MsqdxTypography>
            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 1 }}>
                {t('projects.pageTopicsCompareInteractionHint')}
            </MsqdxTypography>
            {anyFocus ? (
                <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                    <MsqdxButton size="small" variant="outlined" onClick={clearFocus}>
                        {t('projects.pageTopicsCompareClearFocus')}
                    </MsqdxButton>
                    {focusTagKey != null && tagSourceCount >= 2 ? (
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            {t('projects.pageTopicsCompareTagLinkHint', { count: tagSourceCount })}
                        </MsqdxTypography>
                    ) : null}
                </Box>
            ) : null}
            <Box
                component="figure"
                sx={{
                    m: 0,
                    width: '100%',
                    height: { xs: 420, sm: 500, md: 580, lg: 640 },
                    minHeight: { xs: 360, lg: 520 },
                }}
                aria-label={t('domainResult.pageTopicsViewBubbleMatrix')}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 16, right: 20, bottom: 36, left: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                        <XAxis
                            type="number"
                            dataKey="avgTier"
                            name={t('domainResult.pageTopicsAxisAvgTier')}
                            domain={[0.75, 5.25]}
                            ticks={[1, 2, 3, 4, 5]}
                            tick={axisTick}
                            stroke={gridStroke}
                            label={{
                                value: t('domainResult.pageTopicsAxisAvgTier'),
                                position: 'bottom',
                                offset: 10,
                                fill: 'var(--color-text-muted-on-light)',
                                fontSize: 11,
                            }}
                        />
                        <YAxis
                            type="number"
                            dataKey="pageCount"
                            name={t('domainResult.pageTopicsAxisPages')}
                            allowDecimals={false}
                            tick={axisTick}
                            stroke={gridStroke}
                            width={44}
                            label={{
                                value: t('domainResult.pageTopicsAxisPages'),
                                angle: -90,
                                position: 'insideLeft',
                                fill: 'var(--color-text-muted-on-light)',
                                fontSize: 11,
                            }}
                        />
                        <ZAxis type="number" dataKey="zSize" range={[260, 4200]} name="score" />
                        <Tooltip content={<CompareBubbleTooltip t={t} />} cursor={{ strokeDasharray: '4 4', stroke: gridStroke }} />
                        <Scatter
                            data={points}
                            isAnimationActive={false}
                            shape={(props: Record<string, unknown>) => {
                                const cx = props.cx as number;
                                const cy = props.cy as number;
                                const payload = props.payload as PageTopicsBubblePointCompare;
                                const size = (props.size as number) ?? 400;
                                const r = Math.max(5, Math.sqrt(Math.max(size, 1)) / 2);
                                const list = dotPositionsRef.current.get(payload.baseTagKey) ?? [];
                                list.push({ cx, cy });
                                dotPositionsRef.current.set(payload.baseTagKey, list);
                                const full = pointFullOpacity(payload);
                                const tagEmphasis = focusTagKey != null && payload.baseTagKey === focusTagKey;
                                const fill = pageTopicTierColorCss(payload.maxTier, THEME_ACCENT_CSS);
                                const stroke = pageTopicsCompareSeriesStrokeColor(payload.seriesIndex);
                                return (
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r={r}
                                        fill={fill}
                                        stroke={stroke}
                                        strokeWidth={tagEmphasis ? 4 : 2.5}
                                        fillOpacity={full ? 1 : 0.16}
                                        strokeOpacity={full ? 1 : 0.35}
                                        style={{ cursor: 'pointer' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFocusSeriesKey(null);
                                            setFocusTagKey((k) => (k === payload.baseTagKey ? null : payload.baseTagKey));
                                        }}
                                    />
                                );
                            }}
                        />
                        <TagConnectorOverlay focusTagKey={focusTagKey} dotPositionsRef={dotPositionsRef} />
                    </ScatterChart>
                </ResponsiveContainer>
            </Box>

            <MsqdxTypography variant="caption" sx={{ fontWeight: 600, display: 'block', mt: 1.5, mb: 0.5 }}>
                {t('projects.pageTopicsCompareSeriesLegend')}
            </MsqdxTypography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, alignItems: 'center', mb: 1.5 }}>
                {seriesLegend.map((s) => {
                    const selected = focusSeriesKey === s.key;
                    return (
                        <Box
                            key={s.key}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                                setFocusTagKey(null);
                                setFocusSeriesKey((prev) => (prev === s.key ? null : s.key));
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setFocusTagKey(null);
                                    setFocusSeriesKey((prev) => (prev === s.key ? null : s.key));
                                }
                            }}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                cursor: 'pointer',
                                borderRadius: 'var(--msqdx-radius-sm, 6px)',
                                px: 0.75,
                                py: 0.25,
                                outline: selected ? `2px solid ${pageTopicsCompareSeriesStrokeColor(s.index)}` : 'none',
                                outlineOffset: 2,
                                bgcolor: selected ? 'var(--color-secondary-dx-grey-light-tint, rgba(0,0,0,0.04))' : 'transparent',
                            }}
                        >
                            <Box
                                sx={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: '50%',
                                    border: `3px solid ${pageTopicsCompareSeriesStrokeColor(s.index)}`,
                                    bgcolor: 'var(--color-card-bg, #fff)',
                                    flexShrink: 0,
                                }}
                            />
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', maxWidth: 220 }} noWrap title={s.label}>
                                {s.label}
                            </MsqdxTypography>
                        </Box>
                    );
                })}
            </Box>

            <MsqdxTypography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                {t('projects.pageTopicsCompareTierFillCaption')}
            </MsqdxTypography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                {([1, 2, 3, 4, 5] as const).map((tier) => (
                    <Box key={tier} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box
                            sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '2px',
                                bgcolor: pageTopicTierColorCss(tier, THEME_ACCENT_CSS),
                                border: '1px solid var(--color-border-subtle, #e5e7eb)',
                            }}
                        />
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            {t('domainResult.pageTopicsTierLegendShort', { tier })}
                        </MsqdxTypography>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}
