'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import Link from 'next/link';
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
import { MsqdxTypography, MsqdxChip, MsqdxButton } from '@msqdx/react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { normalizePageTopicTagKey } from '@/lib/domain-aggregation';
import { pathResults } from '@/lib/constants';
import type { AggregatedPageClassification, AggregatedPageClassificationTheme } from '@/lib/types';
import {
    buildPageTopicsBubblePoints,
    buildAvgTierTagStrip,
    pageTopicTierColorCss,
    type PageTopicsBubblePoint,
    type TierStripSegment,
} from '@/lib/page-topics-viz';
import { THEME_ACCENT_CSS, msqdxChipThemeAccentSx } from '@/lib/theme-accent';

type Translate = (key: string, values?: Record<string, string | number>) => string;

function themeRowKey(th: AggregatedPageClassificationTheme): string {
    return th.themeTagKey ?? normalizePageTopicTagKey(th.tag);
}

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
            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mt: 0.75, fontStyle: 'italic' }}>
                {t('domainResult.pageTopicsBubbleTooltipClick')}
            </MsqdxTypography>
        </Box>
    );
}

function TierSpectrumStrip({ strip }: { strip: TierStripSegment[] }) {
    return (
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
    );
}

export type PageTopicsVisualizationProps = {
    t: Translate;
    pageClassification: AggregatedPageClassification;
};

type SpectrumScope = 'domain' | 'theme';

export function PageTopicsVisualization({ t, pageClassification }: PageTopicsVisualizationProps) {
    const { topThemes, tierDistribution } = pageClassification;
    const bubblePoints = useMemo(() => buildPageTopicsBubblePoints(topThemes), [topThemes]);
    const stripDomain = useMemo(() => buildAvgTierTagStrip(tierDistribution.avgTagsPerPageByTier), [tierDistribution]);
    const hasBubbleChart = bubblePoints.length > 0;

    const [selectedThemeKey, setSelectedThemeKey] = useState<string | null>(null);
    const [spectrumScope, setSpectrumScope] = useState<SpectrumScope>('domain');

    useEffect(() => {
        if (!selectedThemeKey) setSpectrumScope('domain');
    }, [selectedThemeKey]);

    const selectedTheme = useMemo(
        () => topThemes.find((th) => themeRowKey(th) === selectedThemeKey),
        [topThemes, selectedThemeKey],
    );

    const hasThemeSubset = Boolean(selectedTheme?.subsetAvgTagsPerPageByTier);

    const activeStrip = useMemo(() => {
        if (spectrumScope === 'theme' && selectedTheme?.subsetAvgTagsPerPageByTier) {
            return buildAvgTierTagStrip(selectedTheme.subsetAvgTagsPerPageByTier);
        }
        return stripDomain;
    }, [spectrumScope, selectedTheme, stripDomain]);

    const gridStroke = 'var(--color-border-subtle, #e5e7eb)';
    const axisTick = { fill: 'var(--color-text-muted-on-light)', fontSize: 11 };

    const handleScatterClick = (data: unknown) => {
        const row = data as { payload?: PageTopicsBubblePoint } | PageTopicsBubblePoint | null | undefined;
        const payload =
            row && typeof row === 'object' && 'payload' in row && row.payload
                ? row.payload
                : (row as PageTopicsBubblePoint | undefined);
        const key = payload?.themeTagKey;
        if (!key) return;
        setSelectedThemeKey((prev) => (prev === key ? null : key));
    };

    const related = selectedTheme?.relatedPages ?? [];
    const relatedShown = related.length;
    const relatedTotal = selectedTheme?.pageCount ?? 0;

    return (
        <Box sx={{ mb: 'var(--msqdx-spacing-md)' }}>
            {hasBubbleChart && (
                <>
                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t('domainResult.pageTopicsDiagramTitle')}
                    </MsqdxTypography>
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 0.5 }}>
                        {t('domainResult.pageTopicsBubbleMatrixCaption')}
                    </MsqdxTypography>
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 1.5 }}>
                        {t('domainResult.pageTopicsClickBubbleHint')}
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
                                    onClick={handleScatterClick}
                                >
                                    {bubblePoints.map((pt, i) => {
                                        const isSel = pt.themeTagKey === selectedThemeKey;
                                        return (
                                            <Cell
                                                key={`${pt.tag}-${i}`}
                                                fill={pageTopicTierColorCss(pt.maxTier, THEME_ACCENT_CSS)}
                                                stroke={isSel ? THEME_ACCENT_CSS : 'var(--color-card-bg, #fff)'}
                                                strokeWidth={isSel ? 3 : 1}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        );
                                    })}
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

            {selectedTheme && (
                <Box
                    sx={{
                        mt: 2,
                        mb: 1,
                        p: 1.5,
                        borderRadius: 'var(--msqdx-radius-md)',
                        border: '1px solid var(--color-border-subtle, #e5e7eb)',
                        bgcolor: 'var(--color-card-bg, #fff)',
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                        <Box sx={{ minWidth: 0 }}>
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {selectedTheme.tag}
                            </MsqdxTypography>
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mt: 0.5 }}>
                                {t('domainResult.pageTopicsBubbleTooltip', {
                                    pages: selectedTheme.pageCount,
                                    maxTier: selectedTheme.maxTier,
                                    avgTier: selectedTheme.avgTier,
                                    score: selectedTheme.score,
                                })}
                            </MsqdxTypography>
                        </Box>
                        <MsqdxButton size="small" variant="text" onClick={() => setSelectedThemeKey(null)} sx={{ flexShrink: 0 }}>
                            {t('domainResult.pageTopicsClearSelection')}
                        </MsqdxButton>
                    </Box>

                    {hasThemeSubset && (
                        <Box sx={{ mt: 1.5 }}>
                            <ToggleButtonGroup
                                value={spectrumScope}
                                exclusive
                                size="small"
                                onChange={(_, v: SpectrumScope | null) => {
                                    if (v != null) setSpectrumScope(v);
                                }}
                                aria-label={t('domainResult.pageTopicsTierSpectrumTitle')}
                            >
                                <ToggleButton value="domain">{t('domainResult.pageTopicsSpectrumScopeDomain')}</ToggleButton>
                                <ToggleButton value="theme">{t('domainResult.pageTopicsSpectrumScopeTheme')}</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                    )}

                    {relatedShown > 0 ? (
                        <Box sx={{ mt: 1.5 }}>
                            <MsqdxTypography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
                                {t('domainResult.pageTopicsThemeRelatedPages')}
                            </MsqdxTypography>
                            <Box component="ul" sx={{ m: 0, pl: 2, mb: 0.5 }}>
                                {related.map((rp) => (
                                    <Box component="li" key={rp.id} sx={{ mb: 0.5 }}>
                                        <Link href={pathResults(rp.id)} style={{ fontSize: 13, wordBreak: 'break-all' }}>
                                            {rp.url.length > 96 ? `${rp.url.slice(0, 93)}…` : rp.url}
                                        </Link>
                                    </Box>
                                ))}
                            </Box>
                            {relatedTotal > relatedShown ? (
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                    {t('domainResult.pageTopicsThemeRelatedPagesMore', { shown: relatedShown, total: relatedTotal })}
                                </MsqdxTypography>
                            ) : null}
                        </Box>
                    ) : null}
                </Box>
            )}

            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, mt: hasBubbleChart ? 2 : 0 }}>
                {t('domainResult.pageTopicsTierSpectrumTitle')}
            </MsqdxTypography>
            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 1 }}>
                {spectrumScope === 'theme' && hasThemeSubset
                    ? t('domainResult.pageTopicsTierSpectrumCaptionTheme')
                    : t('domainResult.pageTopicsTierSpectrumCaption')}
            </MsqdxTypography>
            <TierSpectrumStrip strip={activeStrip} />

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
