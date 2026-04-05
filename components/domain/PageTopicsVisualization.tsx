'use client';

import { useMemo } from 'react';
import { Box } from '@mui/material';
import { Treemap, Tooltip, ResponsiveContainer } from 'recharts';
import { MsqdxTypography, MsqdxChip } from '@msqdx/react';
import type { AggregatedPageClassification } from '@/lib/types';
import {
    buildPageTopicsTreemapLeaves,
    buildAvgTierTagStrip,
    pageTopicTierColorCss,
} from '@/lib/page-topics-viz';
import { THEME_ACCENT_CSS, THEME_ACCENT_CONTRAST_CSS, msqdxChipThemeAccentSx } from '@/lib/theme-accent';

type Translate = (key: string, values?: Record<string, string | number>) => string;

type TreemapNodeProps = {
    x: number;
    y: number;
    width: number;
    height: number;
    depth: number;
    name?: string;
    fullName?: string;
    maxTier?: 1 | 2 | 3 | 4 | 5;
    pageCount?: number;
    children?: unknown[];
};

function PageTopicsTreemapCell(props: TreemapNodeProps) {
    const { x, y, width, height, depth, name = '', fullName, maxTier = 3, pageCount = 0, children } = props;

    if (depth === 0) {
        return <rect x={x} y={y} width={width} height={height} fill="transparent" stroke="none" aria-hidden />;
    }
    if (Array.isArray(children) && children.length > 0) {
        return <rect x={x} y={y} width={width} height={height} fill="transparent" stroke="none" aria-hidden />;
    }

    const fill = pageTopicTierColorCss(maxTier, THEME_ACCENT_CSS);
    const textFill = maxTier >= 4 ? THEME_ACCENT_CONTRAST_CSS : 'var(--color-text-on-light, #111827)';
    const showText = width > 52 && height > 22;
    const label =
        name.length > 24 && width < 140 ? `${name.slice(0, 12)}…` : name.length > 36 ? `${name.slice(0, 34)}…` : name;
    const tip = `${fullName ?? name} · ${pageCount} · max. T${maxTier}`;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx={3}
                ry={3}
                fill={fill}
                stroke="var(--color-card-bg, #fff)"
                strokeWidth={1}
            />
            {showText && (
                <text
                    x={x + 5}
                    y={y + Math.min(height / 2 + 4, height - 6)}
                    fontSize={width > 100 ? 11 : 10}
                    fill={textFill}
                    style={{ pointerEvents: 'none' }}
                >
                    {label}
                </text>
            )}
            <title>{tip}</title>
        </g>
    );
}

function PageTopicsTreemapTooltip({
    active,
    payload,
    t,
}: {
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: TreemapNodeProps & { fullName?: string; name?: string } }>;
    t: Translate;
}) {
    if (!active || !payload?.length) return null;
    const raw = payload[0]?.payload;
    if (!raw || typeof raw.pageCount !== 'number') return null;
    const display = raw.fullName ?? raw.name ?? '';
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
                {display}
            </MsqdxTypography>
            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mt: 0.5 }}>
                {t('domainResult.pageTopicsTreemapTooltip', {
                    pages: raw.pageCount,
                    maxTier: raw.maxTier ?? 1,
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
    const leaves = useMemo(() => buildPageTopicsTreemapLeaves(topThemes), [topThemes]);
    const strip = useMemo(() => buildAvgTierTagStrip(tierDistribution.avgTagsPerPageByTier), [tierDistribution]);

    return (
        <Box sx={{ mb: 'var(--msqdx-spacing-md)' }}>
            {leaves.length > 0 && (
                <>
                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t('domainResult.pageTopicsDiagramTitle')}
                    </MsqdxTypography>
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 1.5 }}>
                        {t('domainResult.pageTopicsDiagramCaption')}
                    </MsqdxTypography>
                    <Box
                        component="figure"
                        sx={{ m: 0, width: '100%' }}
                        aria-label={t('domainResult.pageTopicsDiagramTitle')}
                    >
                        <ResponsiveContainer width="100%" height={320}>
                            <Treemap
                                data={leaves}
                                dataKey="value"
                                nameKey="name"
                                stroke="transparent"
                                isAnimationActive={false}
                                content={(props: unknown) => (
                                    <PageTopicsTreemapCell {...(props as TreemapNodeProps)} />
                                )}
                            >
                                <Tooltip
                                    content={<PageTopicsTreemapTooltip t={t} />}
                                    cursor={{ stroke: 'var(--color-border-subtle)', strokeWidth: 1 }}
                                />
                            </Treemap>
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

            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, mt: leaves.length > 0 ? 2 : 0 }}>
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

            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, mt: 2 }}>
                {t('domainResult.pageTopicsTopThemes')}
            </MsqdxTypography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xs)' }}>
                {topThemes.slice(0, 24).map((th, idx) => (
                    <MsqdxChip
                        key={`${th.tag}-${idx}`}
                        size="small"
                        label={t('domainResult.pageTopicsThemeChip', {
                            tag: th.tag,
                            pages: th.pageCount,
                            maxTier: th.maxTier,
                        })}
                        sx={msqdxChipThemeAccentSx(th.maxTier >= 4)}
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
                <MsqdxChip
                    size="small"
                    label={t('domainResult.pageTopicsLowTierDominant', { count: tierDistribution.pagesDominatedByLowTiers })}
                />
            </Box>
        </Box>
    );
}
