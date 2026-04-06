'use client';

import { useMemo } from 'react';
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
    Cell,
} from 'recharts';
import { MsqdxTypography, MsqdxChip } from '@msqdx/react';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { AggregatedPageClassification } from '@/lib/types';
import {
    buildPageTopicsBubblePoints,
    buildAvgTierTagStrip,
    pageTopicTierColorCss,
    type PageTopicsBubblePoint,
} from '@/lib/page-topics-viz';
import { THEME_ACCENT_CSS, msqdxChipThemeAccentSx } from '@/lib/theme-accent';

type Translate = (key: string, values?: Record<string, string | number>) => string;

function PageTopicsBubbleTooltip({
    active,
    payload,
    t,
}: {
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: PageTopicsBubblePoint }>;
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
                maxWidth: 320,
                bgcolor: 'var(--color-card-bg, #fff)',
                border: '1px solid var(--color-border-subtle, #e5e7eb)',
                borderRadius: 'var(--msqdx-radius-sm, 6px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
        >
            <MsqdxTypography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
                {p.tag}
            </MsqdxTypography>
            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mt: 0.5 }}>
                {t('domainResult.pageTopicsBubbleTooltip', {
                    pages: p.pageCount,
                    maxTier: p.maxTier,
                    avgTier: p.avgTier,
                    score: Math.round(p.zSize * 100) / 100,
                })}
            </MsqdxTypography>
        </Box>
    );
}

export type PageTopicsVisualizationProps = {
    t: Translate;
    pageClassification: AggregatedPageClassification;
};

export function PageTopicsVisualization({ t, pageClassification }: PageTopicsVisualizationProps) {
    const { topThemes, tierDistribution } = pageClassification;
    const bubblePoints = useMemo(() => buildPageTopicsBubblePoints(topThemes), [topThemes]);
    const strip = useMemo(() => buildAvgTierTagStrip(tierDistribution.avgTagsPerPageByTier), [tierDistribution]);
    const hasBubbleChart = bubblePoints.length > 0;

    const gridStroke = 'var(--color-border-subtle, #e5e7eb)';
    const axisTick = { fill: 'var(--color-text-muted-on-light)', fontSize: 11 };

    return (
        <Box sx={{ mb: 'var(--msqdx-spacing-md)' }}>
            {hasBubbleChart && (
                <>
                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t('domainResult.pageTopicsDiagramTitle')}
                    </MsqdxTypography>
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 1.5 }}>
                        {t('domainResult.pageTopicsBubbleMatrixCaption')}
                    </MsqdxTypography>
                    <Box
                        component="figure"
                        sx={{
                            m: 0,
                            width: '100%',
                            height: { xs: 460, sm: 540, md: 640, lg: 720 },
                            minHeight: { xs: 400, lg: 560 },
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
                                <ZAxis type="number" dataKey="zSize" range={[280, 4800]} name="score" />
                                <Tooltip
                                    content={<PageTopicsBubbleTooltip t={t} />}
                                    cursor={{ strokeDasharray: '4 4', stroke: gridStroke }}
                                />
                                <Scatter
                                    data={bubblePoints}
                                    isAnimationActive={false}
                                    shape="circle"
                                    stroke="var(--color-card-bg, #fff)"
                                    strokeWidth={1}
                                >
                                    {bubblePoints.map((pt, i) => (
                                        <Cell
                                            key={`${pt.tag}-${i}`}
                                            fill={pageTopicTierColorCss(pt.maxTier, THEME_ACCENT_CSS)}
                                        />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mt: 1.5 }}>
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
                </>
            )}

            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, mt: hasBubbleChart ? 2 : 0 }}>
                {t('domainResult.pageTopicsTierSpectrumTitle')}
            </MsqdxTypography>
            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 1 }}>
                {t('domainResult.pageTopicsTierSpectrumCaption')}
            </MsqdxTypography>
            <Box
                sx={{
                    display: 'flex',
                    width: '100%',
                    height: 12,
                    borderRadius: 'var(--msqdx-radius-sm, 6px)',
                    overflow: 'hidden',
                    gap: '3px',
                    bgcolor: 'var(--color-border-subtle, #eee)',
                    p: '3px',
                }}
            >
                {strip.map((s) => (
                    <Box
                        key={s.tier}
                        sx={{
                            flexGrow: s.ratio,
                            flexBasis: 0,
                            minWidth: s.ratio > 0.04 ? 4 : 0,
                            borderRadius: '4px',
                            bgcolor: pageTopicTierColorCss(s.tier, THEME_ACCENT_CSS),
                            transition: 'flex-grow 0.2s ease',
                        }}
                    />
                ))}
            </Box>

            <MsqdxTypography variant="subtitle2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 'var(--msqdx-spacing-xs)', mt: 2 }}>
                {t('domainResult.pageTopicsTierMix')}
            </MsqdxTypography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-md)' }}>
                <MsqdxChip size="small" label={t('domainResult.pageTopicsAvgT1', { n: tierDistribution.avgTagsPerPageByTier.tier1 })} />
                <MsqdxChip size="small" label={t('domainResult.pageTopicsAvgT2', { n: tierDistribution.avgTagsPerPageByTier.tier2 })} />
                <MsqdxChip size="small" label={t('domainResult.pageTopicsAvgT3', { n: tierDistribution.avgTagsPerPageByTier.tier3 })} />
                <MsqdxChip size="small" label={t('domainResult.pageTopicsAvgT4', { n: tierDistribution.avgTagsPerPageByTier.tier4 })} />
                <MsqdxChip size="small" label={t('domainResult.pageTopicsAvgT5', { n: tierDistribution.avgTagsPerPageByTier.tier5 })} />
                <MsqdxChip
                    size="small"
                    label={t('domainResult.pageTopicsCorePages', { count: tierDistribution.pagesWithAtLeastOneTier5 })}
                    sx={msqdxChipThemeAccentSx(true)}
                />
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, maxWidth: '100%' }}>
                    <MsqdxChip
                        size="small"
                        label={t('domainResult.pageTopicsLowTierDominant', { count: tierDistribution.pagesDominatedByLowTiers })}
                    />
                    <InfoTooltip title={t('info.pageTopicsLowTierDominant')} ariaLabel={t('common.info')} />
                </Box>
            </Box>
        </Box>
    );
}
