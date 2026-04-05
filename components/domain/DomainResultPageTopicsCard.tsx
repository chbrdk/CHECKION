'use client';

import React, { memo } from 'react';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxCard, MsqdxChip } from '@msqdx/react';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { AggregatedPageClassification, AggregatedPageClassificationProfile } from '@/lib/types';

export type DomainResultPageTopicsCardProps = {
    t: (key: string, values?: Record<string, string | number>) => string;
    pageClassification: AggregatedPageClassification;
};

function profileLabel(t: DomainResultPageTopicsCardProps['t'], p: AggregatedPageClassificationProfile): string {
    switch (p) {
        case 'pillar':
            return t('domainResult.pageTopicsProfilePillar');
        case 'hub':
            return t('domainResult.pageTopicsProfileHub');
        case 'utility':
            return t('domainResult.pageTopicsProfileUtility');
        default:
            return t('domainResult.pageTopicsProfileMixed');
    }
}

export const DomainResultPageTopicsCard = memo(function DomainResultPageTopicsCard({
    t,
    pageClassification,
}: DomainResultPageTopicsCardProps) {
    const { coverage, topThemes, tierDistribution, pageSamples } = pageClassification;
    if (coverage.pagesWithClassification <= 0) return null;

    const td = tierDistribution.avgTagsPerPageByTier;

    return (
        <Box sx={{ mt: 'var(--msqdx-spacing-xl)' }}>
            <MsqdxCard
                variant="flat"
                sx={{
                    bgcolor: 'var(--color-card-bg)',
                    p: 'var(--msqdx-spacing-md)',
                    borderRadius: 'var(--msqdx-radius-sm)',
                    border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                }}
            >
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-md)' }}>
                    <MsqdxTypography variant="h6">{t('domainResult.pageTopicsTitle')}</MsqdxTypography>
                    <InfoTooltip title={t('info.pageTopicsAggregate')} ariaLabel={t('common.info')} />
                </Box>

                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 'var(--msqdx-spacing-md)' }}>
                    {t('domainResult.pageTopicsCoverage', {
                        classified: coverage.pagesWithClassification,
                        total: coverage.totalPages,
                    })}
                </MsqdxTypography>

                <MsqdxTypography variant="subtitle2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 'var(--msqdx-spacing-xs)' }}>
                    {t('domainResult.pageTopicsTopThemes')}
                </MsqdxTypography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-md)' }}>
                    {topThemes.slice(0, 24).map((th, idx) => (
                        <MsqdxChip
                            key={`${th.tag}-${idx}`}
                            size="small"
                            label={t('domainResult.pageTopicsThemeChip', {
                                tag: th.tag,
                                pages: th.pageCount,
                                maxTier: th.maxTier,
                            })}
                        />
                    ))}
                </Box>

                <MsqdxTypography variant="subtitle2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 'var(--msqdx-spacing-xs)' }}>
                    {t('domainResult.pageTopicsTierMix')}
                </MsqdxTypography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-md)' }}>
                    <MsqdxChip size="small" label={t('domainResult.pageTopicsAvgT1', { n: td.tier1 })} />
                    <MsqdxChip size="small" label={t('domainResult.pageTopicsAvgT2', { n: td.tier2 })} />
                    <MsqdxChip size="small" label={t('domainResult.pageTopicsAvgT3', { n: td.tier3 })} />
                    <MsqdxChip size="small" label={t('domainResult.pageTopicsAvgT4', { n: td.tier4 })} />
                    <MsqdxChip size="small" label={t('domainResult.pageTopicsAvgT5', { n: td.tier5 })} />
                    <MsqdxChip
                        size="small"
                        brandColor="green"
                        label={t('domainResult.pageTopicsCorePages', { count: tierDistribution.pagesWithAtLeastOneTier5 })}
                    />
                    <MsqdxChip
                        size="small"
                        label={t('domainResult.pageTopicsLowTierDominant', { count: tierDistribution.pagesDominatedByLowTiers })}
                    />
                </Box>

                {pageSamples.length > 0 && (
                    <>
                        <MsqdxTypography variant="subtitle2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 'var(--msqdx-spacing-xs)' }}>
                            {t('domainResult.pageTopicsSamples')}
                        </MsqdxTypography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-xs)' }}>
                            {pageSamples.map((s) => (
                                <MsqdxTypography key={s.url} variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                    <strong>{profileLabel(t, s.profile)}</strong>
                                    {' · '}
                                    {s.url.length > 64 ? `${s.url.slice(0, 61)}…` : s.url}
                                </MsqdxTypography>
                            ))}
                        </Box>
                    </>
                )}
            </MsqdxCard>
        </Box>
    );
});
