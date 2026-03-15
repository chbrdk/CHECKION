'use client';

import React, { useState } from 'react';
import { Box, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxChip, MsqdxButton } from '@msqdx/react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { MSQDX_BRAND_PRIMARY, MSQDX_NEUTRAL, MSQDX_STATUS } from '@msqdx/tokens';
import type { PageIndex, PageIndexRegion, PageIndexRegionType } from '@/lib/types';
import { useI18n } from '@/components/i18n/I18nProvider';
import { PAGE_INDEX_INITIAL_VISIBLE } from '@/lib/constants';

const SEMANTIC_TYPE_LABELS: Record<PageIndexRegionType, string> = {
    pricing: 'Preis',
    faq: 'FAQ',
    contact: 'Kontakt',
    hero: 'Hero',
    product: 'Produkt',
    team: 'Team',
    about: 'Über uns',
    nav: 'Navigation',
    footer: 'Footer',
    main: 'Hauptinhalt',
    aside: 'Seitenleiste',
    unknown: '—',
};

export interface PageIndexCardProps {
    pageIndex: PageIndex;
    /** Optional: show saliency prominence bar when value is present */
    showSaliency?: boolean;
    /** Initial number of regions to show; rest behind "show more". Default from constants. */
    initialVisible?: number;
}

export function PageIndexCard({ pageIndex, showSaliency = true, initialVisible = PAGE_INDEX_INITIAL_VISIBLE }: PageIndexCardProps) {
    const { t } = useI18n();
    const [showAllRegions, setShowAllRegions] = useState(false);

    const regions = Array.isArray(pageIndex?.regions) ? pageIndex.regions : [];
    if (regions.length === 0) {
        return (
            <Box sx={{ p: 2, color: MSQDX_NEUTRAL[600] }}>
                <MsqdxTypography variant="body2">{t('results.pageIndexNoData')}</MsqdxTypography>
            </Box>
        );
    }

    const visibleCount = showAllRegions ? regions.length : Math.min(regions.length, initialVisible);
    const hasMore = regions.length > initialVisible && !showAllRegions;
    const aboveFoldCount = regions.filter((r) => r.aboveFold).length;
    const belowFoldCount = regions.length - aboveFoldCount;
    const typeCounts = regions.reduce<Record<string, number>>((acc, r) => {
        const key = r.semanticType ?? 'unknown';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
    }, {});

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>
                    {t('results.pageIndexTitle')}
                </MsqdxTypography>
                <InfoTooltip title={t('info.pageIndex')} ariaLabel={t('common.info')} />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', mr: 0.5 }}>
                    {t('results.pageIndexAboveFoldCount', { count: aboveFoldCount })}
                    {' · '}
                    {t('results.pageIndexBelowFoldCount', { count: belowFoldCount })}
                </MsqdxTypography>
                {Object.entries(typeCounts)
                    .filter(([k]) => k !== 'unknown' || typeCounts.unknown > 0)
                    .map(([type, count]) => (
                        <MsqdxChip
                            key={type}
                            label={`${SEMANTIC_TYPE_LABELS[type as PageIndexRegionType] ?? type}: ${count}`}
                            size="small"
                            sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                    ))}
            </Box>
            <Box
                component="ul"
                sx={{
                    m: 0,
                    p: 0,
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.75,
                }}
            >
                {regions.slice(0, visibleCount).map((r) => (
                    <RegionRow key={r.id} region={r} showSaliency={showSaliency} t={t} />
                ))}
            </Box>
            {hasMore && (
                <MsqdxButton
                    variant="text"
                    size="small"
                    onClick={() => setShowAllRegions(true)}
                    sx={{ alignSelf: 'flex-start', mt: 0.5 }}
                >
                    {t('results.pageIndexShowMoreRegions', { count: regions.length - initialVisible })}
                </MsqdxButton>
            )}
        </Box>
    );
}

function RegionRow({
    region,
    showSaliency,
    t,
}: {
    region: PageIndexRegion;
    showSaliency: boolean;
    t: (key: string) => string;
}) {
    const isLandmark = region.level === 0;
    const semanticLabel = region.semanticType ? SEMANTIC_TYPE_LABELS[region.semanticType] : null;

    return (
        <Box
            component="li"
            sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
                py: 0.75,
                px: 1.25,
                borderRadius: 1,
                bgcolor: isLandmark ? 'var(--color-secondary-dx-grey-light-tint)' : 'transparent',
                borderLeft: isLandmark ? `3px solid ${MSQDX_BRAND_PRIMARY.purple}` : 'none',
            }}
        >
            <Box
                component="span"
                sx={{
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    color: isLandmark ? MSQDX_BRAND_PRIMARY.purple : MSQDX_NEUTRAL[500],
                    textTransform: 'uppercase',
                    minWidth: 36,
                }}
            >
                {region.tag === 'button' ? t('results.pageIndexTagButton') : region.tag === 'p' ? t('results.pageIndexTagParagraph') : region.tag}
            </Box>
            <MsqdxTypography
                variant="body2"
                sx={{
                    flex: '1 1 180px',
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'var(--color-text-on-light)',
                }}
            >
                {region.headingText || '—'}
            </MsqdxTypography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Box
                    sx={{
                        fontSize: '0.7rem',
                        color: region.aboveFold ? MSQDX_STATUS.success.base : MSQDX_NEUTRAL[500],
                        fontWeight: 500,
                    }}
                >
                    {region.aboveFold ? '✓ ATF' : '—'}
                </Box>
                <Box sx={{ fontSize: '0.75rem', color: MSQDX_NEUTRAL[600], fontWeight: 600 }}>
                    {region.findabilityScore.toFixed(2)}
                </Box>
                {showSaliency && region.saliencyProminence != null && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 60 }}>
                        <Box
                            sx={{
                                width: 40,
                                height: 6,
                                borderRadius: 1,
                                bgcolor: MSQDX_NEUTRAL[200],
                                overflow: 'hidden',
                            }}
                        >
                            <Box
                                sx={{
                                    width: `${Math.round(region.saliencyProminence * 100)}%`,
                                    height: '100%',
                                    bgcolor: MSQDX_BRAND_PRIMARY.orange ?? MSQDX_STATUS.warning.base,
                                }}
                            />
                        </Box>
                        <span style={{ fontSize: '0.65rem', color: MSQDX_NEUTRAL[500] }}>
                            {(region.saliencyProminence * 100).toFixed(0)}%
                        </span>
                    </Box>
                )}
                {semanticLabel && (
                    <MsqdxChip
                        label={semanticLabel}
                        size="small"
                        sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            bgcolor: alpha(MSQDX_BRAND_PRIMARY.green, 0.12),
                            color: MSQDX_BRAND_PRIMARY.green,
                        }}
                    />
                )}
            </Box>
        </Box>
    );
}

